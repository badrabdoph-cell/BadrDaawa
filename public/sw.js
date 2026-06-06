self.addEventListener("push", (event) => {
  event.waitUntil(
    fetch("/api/push/latest", { cache: "no-store" })
      .then((response) => response.json())
      .catch(() => ({
        title: "BadrDaawa",
        body: "عندك إشعار جديد من الدعوة.",
        url: "/",
      }))
      .then((notification) =>
        self.registration.showNotification(notification.title || "BadrDaawa", {
          body: notification.body || "عندك إشعار جديد من الدعوة.",
          data: { url: notification.url || "/" },
          dir: "rtl",
          lang: "ar",
          tag: "badrdaawa-admin-notification",
        }),
      ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(url);
          return undefined;
        }
      }

      return self.clients.openWindow(url);
    }),
  );
});
