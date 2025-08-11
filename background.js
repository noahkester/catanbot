chrome.action.onClicked.addListener((tab) => {
  console.log("listener clicked");
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ['content.js']
    });
  });