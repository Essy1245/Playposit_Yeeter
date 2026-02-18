chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.scripting.insertCSS({
            target: { tabId: tab.id, allFrames: true },
            files: ["styles.css"]
        }).then(() => {
            console.log("Styles injected.");
        }).catch(err => console.error("Failed to inject CSS:", err));

        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ["content.js"]
        }).then(() => {
            console.log("Content script injected.");
        }).catch(err => console.error("Failed to inject script:", err));
    }
});
