if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').catch(error => {
    console.warn('Seasons could not enable offline access.', error);
  });
}
