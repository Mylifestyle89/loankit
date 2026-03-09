/** Client-side utility for Browser Notification API */

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function showBrowserNotification(
  title: string,
  body: string,
  onClick?: () => void,
) {
  if (!isBrowserNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const notif = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: "invoice-reminder",
  });

  if (onClick) {
    notif.onclick = () => {
      window.focus();
      onClick();
      notif.close();
    };
  }
}
