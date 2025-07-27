chrome.runtime.onInstalled.addListener((details) => {
    console.log('YouTube Transcript AI Assistant installed:', details.reason);
    
    if (details.reason === 'install') {
        chrome.storage.local.set({
            customPrompt: 'この動画の内容を要約して、主要なポイントを教えてください：',
            isFirstTime: true
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    if (tab.url && tab.url.includes('youtube.com')) {
        chrome.action.openPopup();
    } else {
        chrome.tabs.create({ url: 'https://www.youtube.com' });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
        chrome.action.setBadgeText({
            text: '●',
            tabId: tabId
        });
        chrome.action.setBadgeBackgroundColor({
            color: '#FF0000',
            tabId: tabId
        });
    } else {
        chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openAITab') {
        chrome.tabs.create({ url: request.url }, (tab) => {
            sendResponse({ success: true, tabId: tab.id });
        });
        return true;
    }
    
    if (request.action === 'copyToClipboard') {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            function: copyTextToClipboard,
            args: [request.text]
        }, (results) => {
            sendResponse({ success: true });
        });
        return true;
    }
});

function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('テキストをクリップボードにコピーしました');
    }).catch(err => {
        console.error('クリップボードへのコピーに失敗:', err);
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'extractTranscript') {
        chrome.action.openPopup();
    }
});

chrome.runtime.onStartup.addListener(() => {
    console.log('YouTube Transcript AI Assistant started');
});

chrome.commands.onCommand.addListener((command) => {
    if (command === 'extract-transcript') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.url && activeTab.url.includes('youtube.com/watch')) {
                chrome.action.openPopup();
            }
        });
    }
});