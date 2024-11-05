chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_LINK') {
    fetch(request.url, { method: 'HEAD' })
      .then(response => sendResponse(response.ok))
      .catch(() => sendResponse(false));
    return true; // Keep the message channel open
  }
}); 