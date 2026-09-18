// Ver.1.1では古いキャッシュによる不具合を避けるため、Service Workerを使用しません。
self.addEventListener("install", event => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.registration.unregister()));
