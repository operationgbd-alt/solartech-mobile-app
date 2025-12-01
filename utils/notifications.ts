import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Appointment } from "@/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function scheduleAppointmentNotification(
  appointment: Appointment
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  if (!appointment.notifyBefore) {
    return null;
  }

  const notifyTime = new Date(appointment.date);
  notifyTime.setMinutes(notifyTime.getMinutes() - appointment.notifyBefore);

  if (notifyTime.getTime() <= Date.now()) {
    return null;
  }

  const typeLabel =
    appointment.type === "sopralluogo" ? "Sopralluogo" : "Installazione";
  const minutesLabel = appointment.notifyBefore >= 60
    ? `${Math.floor(appointment.notifyBefore / 60)} or${appointment.notifyBefore >= 120 ? "e" : "a"}`
    : `${appointment.notifyBefore} minuti`;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${typeLabel} tra ${minutesLabel}`,
        body: `${appointment.clientName} - ${appointment.address}`,
        data: { appointmentId: appointment.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifyTime,
      },
    });

    return notificationId;
  } catch (error) {
    console.log("Error scheduling notification:", error);
    return null;
  }
}

export async function cancelAppointmentNotification(
  notificationId: string
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.log("Error canceling notification:", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Error canceling all notifications:", error);
  }
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (Platform.OS === "web") {
    return [];
  }

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Error getting scheduled notifications:", error);
    return [];
  }
}

export async function cancelNotificationByAppointmentId(
  appointmentId: string
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const matchingNotification = scheduledNotifications.find(
      (n) => n.content.data?.appointmentId === appointmentId
    );
    
    if (matchingNotification) {
      await Notifications.cancelScheduledNotificationAsync(matchingNotification.identifier);
    }
  } catch (error) {
    console.log("Error canceling notification by appointment ID:", error);
  }
}
