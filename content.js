console.log("Content script loaded!");

function getRawText() {
  console.log("getRawText function called");
  const elements = document.querySelectorAll(".eventsTab .logText.playerName");
  let combinedText = "";
  elements.forEach((el) => {
    combinedText += el.textContent.trim();
  });

  alert(combinedText);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request);
  if (request.action === "ping") {
    sendResponse({status: "pong"});
  } else if (request.action === "extractText") {
    console.log("Extracting text...");
    getRawText();
    sendResponse({status: "success"});
  }
  return true;
});
