class YouTubeTranscriptExtractor {
    constructor() {
        this.transcript = '';
        this.videoId = '';
        this.isExtracted = false;
    }

    getVideoId() {
        const url = window.location.href;
        const match = url.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
    }

    async extractTranscriptFromAPI() {
        try {
            const videoId = this.getVideoId();
            if (!videoId) {
                throw new Error('動画IDが見つかりません');
            }

            const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await response.text();
            
            const captionMatch = html.match(/"captions":({.+?}]}})/);
            if (!captionMatch) {
                throw new Error('字幕情報が見つかりません');
            }

            const captionData = JSON.parse(captionMatch[1]);
            const captionTracks = captionData.playerCaptionsTracklistRenderer?.captionTracks;
            
            if (!captionTracks || captionTracks.length === 0) {
                throw new Error('字幕トラックが見つかりません');
            }

            const jaTrack = captionTracks.find(track => 
                track.languageCode === 'ja' || track.languageCode === 'ja-JP'
            );
            
            const targetTrack = jaTrack || captionTracks[0];
            const transcriptUrl = targetTrack.baseUrl;
            
            const transcriptResponse = await fetch(transcriptUrl);
            const transcriptXml = await transcriptResponse.text();
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(transcriptXml, 'text/xml');
            const textNodes = xmlDoc.querySelectorAll('text');
            
            let transcript = '';
            textNodes.forEach(node => {
                const text = node.textContent;
                if (text && text.trim()) {
                    transcript += text.trim() + ' ';
                }
            });
            
            this.transcript = transcript.trim();
            this.videoId = videoId;
            this.isExtracted = true;
            
            return this.transcript;
            
        } catch (error) {
            console.error('字幕の抽出に失敗:', error);
            throw error;
        }
    }

    async extractTranscriptFromDOM() {
        try {
            const transcriptButton = document.querySelector('[aria-label*="文字起こし"], [aria-label*="transcript"], button[aria-label*="Show transcript"]');
            
            if (!transcriptButton) {
                throw new Error('文字起こしボタンが見つかりません');
            }

            transcriptButton.click();
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const transcriptPanel = document.querySelector('[aria-label*="文字起こし"], [data-target-id="engagement-panel-searchable-transcript"]');
            
            if (!transcriptPanel) {
                throw new Error('文字起こしパネルが見つかりません');
            }

            const transcriptItems = transcriptPanel.querySelectorAll(
                'ytd-transcript-segment-renderer, [role="button"]'
            );
            
            let transcript = '';
            transcriptItems.forEach(item => {
                const textElement = item.querySelector('.segment-text, .ytd-transcript-segment-renderer');
                if (textElement) {
                    const text = textElement.textContent?.trim();
                    if (text) {
                        transcript += text + ' ';
                    }
                }
            });
            
            if (!transcript.trim()) {
                const allText = transcriptPanel.textContent || '';
                const lines = allText.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed && 
                           !trimmed.match(/^\d+:\d+$/) && 
                           !trimmed.includes('文字起こし') &&
                           !trimmed.includes('transcript');
                });
                transcript = lines.join(' ');
            }
            
            this.transcript = transcript.trim();
            this.videoId = this.getVideoId();
            this.isExtracted = true;
            
            return this.transcript;
            
        } catch (error) {
            console.error('DOM からの文字起こし抽出に失敗:', error);
            throw error;
        }
    }

    async extractTranscript() {
        try {
            try {
                return await this.extractTranscriptFromAPI();
            } catch (apiError) {
                console.log('API方式での抽出に失敗、DOM方式を試行中...');
                return await this.extractTranscriptFromDOM();
            }
        } catch (error) {
            console.error('文字起こしの抽出に完全に失敗:', error);
            throw new Error('文字起こしを取得できませんでした。動画に字幕が利用可能か確認してください。');
        }
    }

    getTranscript() {
        return this.transcript;
    }

    getVideoInfo() {
        const title = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.title.style-scope.ytd-video-primary-info-renderer')?.textContent?.trim() || '';
        const channel = document.querySelector('#channel-name a, ytd-channel-name a')?.textContent?.trim() || '';
        
        return {
            title,
            channel,
            videoId: this.videoId,
            url: window.location.href
        };
    }
}

const transcriptExtractor = new YouTubeTranscriptExtractor();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractTranscript') {
        transcriptExtractor.extractTranscript()
            .then(transcript => {
                const videoInfo = transcriptExtractor.getVideoInfo();
                sendResponse({
                    success: true,
                    transcript: transcript,
                    videoInfo: videoInfo
                });
            })
            .catch(error => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
        return true;
    }
    
    if (request.action === 'getTranscript') {
        const transcript = transcriptExtractor.getTranscript();
        const videoInfo = transcriptExtractor.getVideoInfo();
        sendResponse({
            success: true,
            transcript: transcript,
            videoInfo: videoInfo,
            isExtracted: transcriptExtractor.isExtracted
        });
        return true;
    }
    
    if (request.action === 'checkYouTube') {
        const isYouTube = window.location.hostname.includes('youtube.com');
        const videoId = transcriptExtractor.getVideoId();
        sendResponse({
            isYouTube: isYouTube,
            hasVideo: !!videoId,
            videoId: videoId
        });
        return true;
    }
});

console.log('YouTube Transcript Extractor loaded');