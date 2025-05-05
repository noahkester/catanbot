document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("myButton");
  button.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]?.id) {
        console.error("No active tab found");
        return;
      }

      // First try to send a ping message to check if content script is loaded
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "ping" },
        function(response) {
          if (chrome.runtime.lastError) {
            // Content script not loaded, inject it
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
            }, () => {
              // After injection, send the actual message
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: "extractText" },
                  function(response) {
                    if (chrome.runtime.lastError) {
                      console.error("Error:", chrome.runtime.lastError);
                      alert("Error: " + chrome.runtime.lastError.message);
                    } else {
                      console.log("Response:", response);
                    }
                  }
                );
              }, 500); // Give it a moment to load
            });
          } else {
            // Content script is loaded, send the message
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "extractText" },
              function(response) {
                if (chrome.runtime.lastError) {
                  console.error("Error:", chrome.runtime.lastError);
                  alert("Error: " + chrome.runtime.lastError.message);
                } else {
                  console.log("Response:", response);
                }
              }
            );
          }
        }
      );
    });
  });
});
