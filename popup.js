class PopupController {
    constructor() {
        this.transcript = '';
        this.videoInfo = {};
        this.customPrompt = '';
        this.init();
    }

    async init() {
        await this.loadStoredData();
        this.setupEventListeners();
        await this.checkCurrentTab();
        this.updateUI();
    }

    async loadStoredData() {
        try {
            const result = await chrome.storage.local.get(['customPrompt']);
            this.customPrompt = result.customPrompt || '';
            document.getElementById('customPrompt').value = this.customPrompt;
        } catch (error) {
            console.error('データの読み込みに失敗:', error);
        }
    }

    async saveCustomPrompt() {
        try {
            this.customPrompt = document.getElementById('customPrompt').value;
            await chrome.storage.local.set({ customPrompt: this.customPrompt });
            this.showStatus('プロンプトを保存しました', 'success');
        } catch (error) {
            this.showStatus('保存に失敗しました', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('copyBtn').addEventListener('click', () => this.copyTranscript());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshTranscript());
        document.getElementById('savePromptBtn').addEventListener('click', () => this.saveCustomPrompt());
        document.getElementById('clearPromptBtn').addEventListener('click', () => this.clearPrompt());
        
        document.getElementById('chatgptBtn').addEventListener('click', () => this.sendToAI('chatgpt'));
        document.getElementById('claudeBtn').addEventListener('click', () => this.sendToAI('claude'));
        document.getElementById('geminiBtn').addEventListener('click', () => this.sendToAI('gemini'));
    }

    async checkCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) {
                this.showStatus('タブ情報を取得できません', 'error');
                return;
            }

            if (!tab.url.includes('youtube.com/watch')) {
                this.showStatus('YouTube動画ページを開いてください', 'error');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkYouTube' });
            
            if (response && response.isYouTube && response.hasVideo) {
                this.showStatus('動画を検出しました。文字起こしを取得中...', 'loading');
                await this.getTranscript();
            } else {
                this.showStatus('YouTube動画が見つかりません', 'error');
            }
        } catch (error) {
            console.error('タブチェックエラー:', error);
            this.showStatus('YouTube動画ページを開いてください', 'error');
        }
    }

    async getTranscript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            this.showStatus('文字起こしを取得中...', 'loading');
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' });
            
            if (response && response.success) {
                if (response.transcript && response.transcript.trim()) {
                    this.transcript = response.transcript;
                    this.videoInfo = response.videoInfo || {};
                    this.showStatus('文字起こしを取得しました', 'success');
                } else {
                    await this.extractTranscriptFromTab();
                }
            } else {
                await this.extractTranscriptFromTab();
            }
        } catch (error) {
            console.error('文字起こし取得エラー:', error);
            await this.extractTranscriptFromTab();
        }
    }

    async extractTranscriptFromTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractTranscript' });
            
            if (response && response.success) {
                this.transcript = response.transcript;
                this.videoInfo = response.videoInfo || {};
                this.showStatus('文字起こしを取得しました', 'success');
            } else {
                throw new Error(response?.error || '文字起こしの取得に失敗しました');
            }
        } catch (error) {
            console.error('文字起こし抽出エラー:', error);
            this.showStatus('文字起こしを取得できませんでした。動画に字幕があることを確認してください。', 'error');
        }
    }

    async refreshTranscript() {
        this.transcript = '';
        this.videoInfo = {};
        await this.getTranscript();
        this.updateUI();
    }

    updateUI() {
        const transcriptElement = document.getElementById('transcript');
        const transcriptSection = document.getElementById('transcriptSection');
        
        if (this.transcript && this.transcript.trim()) {
            transcriptElement.textContent = this.transcript;
            transcriptSection.style.display = 'block';
        } else {
            transcriptElement.textContent = '文字起こしがここに表示されます';
            transcriptSection.style.display = 'none';
        }
    }

    async copyTranscript() {
        if (!this.transcript) {
            this.showStatus('コピーする文字起こしがありません', 'error');
            return;
        }

        try {
            const fullText = this.buildFullText();
            await navigator.clipboard.writeText(fullText);
            this.showStatus('文字起こしをコピーしました', 'success');
        } catch (error) {
            console.error('コピーエラー:', error);
            this.showStatus('コピーに失敗しました', 'error');
        }
    }

    buildFullText() {
        let fullText = '';
        
        if (this.customPrompt.trim()) {
            fullText += this.customPrompt.trim() + '\n\n';
        }
        
        if (this.videoInfo.title) {
            fullText += `動画タイトル: ${this.videoInfo.title}\n`;
        }
        if (this.videoInfo.channel) {
            fullText += `チャンネル: ${this.videoInfo.channel}\n`;
        }
        if (this.videoInfo.url) {
            fullText += `URL: ${this.videoInfo.url}\n`;
        }
        
        fullText += '\n文字起こし:\n' + this.transcript;
        
        return fullText;
    }

    clearPrompt() {
        document.getElementById('customPrompt').value = '';
        this.customPrompt = '';
        chrome.storage.local.remove('customPrompt');
        this.showStatus('プロンプトをクリアしました', 'success');
    }

    async sendToAI(aiType) {
        if (!this.transcript) {
            this.showStatus('送信する文字起こしがありません', 'error');
            return;
        }

        try {
            const fullText = this.buildFullText();
            const encodedText = encodeURIComponent(fullText);
            
            let url;
            switch (aiType) {
                case 'chatgpt':
                    url = `https://chat.openai.com/?model=gpt-4`;
                    break;
                case 'claude':
                    url = `https://claude.ai/chat`;
                    break;
                case 'gemini':
                    url = `https://gemini.google.com/app`;
                    break;
                default:
                    throw new Error('不明AIタイプ');
            }

            await navigator.clipboard.writeText(fullText);
            
            chrome.tabs.create({ url: url }, (tab) => {
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'pasteText',
                        text: fullText
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('自動貼り付けに失敗、クリップボードにコピーしました');
                        }
                    });
                }, 3000);
            });
            
            this.showStatus(`${aiType.toUpperCase()}を開き、テキストをクリップボードにコピーしました`, 'success');
            
        } catch (error) {
            console.error('AI送信エラー:', error);
            this.showStatus('送信に失敗しました', 'error');
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status');
        const loadingElement = document.getElementById('loading');
        
        if (type === 'loading') {
            statusElement.style.display = 'none';
            loadingElement.style.display = 'flex';
            loadingElement.querySelector('span').textContent = message;
        } else {
            loadingElement.style.display = 'none';
            statusElement.style.display = 'block';
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;
            
            if (type === 'success' || type === 'error') {
                setTimeout(() => {
                    if (this.transcript) {
                        statusElement.textContent = '文字起こしを取得済み';
                        statusElement.className = 'status-message success';
                    } else {
                        statusElement.textContent = 'YouTube動画を開いてください';
                        statusElement.className = 'status-message';
                    }
                }, 3000);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});