import { getPublishMeta } from "./project-content-store";
import { publishAllChanges } from "./publish-pipeline";

export async function checkAndAutoPublish(): Promise<{ executed: boolean; message: string }> {
  const meta = await getPublishMeta();

  // Check if auto-publish is enabled
  if (!meta.autoPublishEnabled) {
    return {
      executed: false,
      message: "Auto-publish is disabled",
    };
  }

  // Check if there are unpublished changes
  if (!meta.hasUnpublishedChanges) {
    return {
      executed: false,
      message: "No unpublished changes",
    };
  }

  // Check if enough time has passed since last publish
  if (meta.lastPublishedAt) {
    const lastPublishTime = new Date(meta.lastPublishedAt).getTime();
    const intervalMs = meta.autoPublishIntervalMinutes * 60 * 1000;
    const timeSinceLastPublish = Date.now() - lastPublishTime;

    if (timeSinceLastPublish < intervalMs) {
      const remainingMinutes = Math.ceil((intervalMs - timeSinceLastPublish) / (60 * 1000));
      return {
        executed: false,
        message: `Waiting ${remainingMinutes} minutes before auto-publish`,
      };
    }
  }

  // Execute auto-publish
  console.log("[Auto Publish] Executing auto-publish");
  const result = await publishAllChanges("Auto-Publish Scheduler");

  if (result.success) {
    return {
      executed: true,
      message: `Auto-published ${result.publishedKeys.length} items successfully`,
    };
  } else {
    return {
      executed: false,
      message: `Auto-publish failed: ${result.message}`,
    };
  }
}

export async function getNextAutoPublishTime(): Promise<Date | null> {
  const meta = await getPublishMeta();

  if (!meta.autoPublishEnabled || !meta.hasUnpublishedChanges || !meta.lastPublishedAt) {
    return null;
  }

  const lastPublishTime = new Date(meta.lastPublishedAt).getTime();
  const intervalMs = meta.autoPublishIntervalMinutes * 60 * 1000;
  const nextPublishTime = lastPublishTime + intervalMs;

  return new Date(nextPublishTime);
}
