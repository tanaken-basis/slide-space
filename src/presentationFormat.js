// Independent helpers; existing conversion behavior is preserved.

export const formatPresentationElapsedTime = function (seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const secs = totalSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),

      String(minutes).padStart(2, "0"),

      String(secs).padStart(2, "0"),
    ].join(":");
  }

  return [String(minutes).padStart(2, "0"), String(secs).padStart(2, "0")].join(
    ":",
  );
};

export const formatPresentationClock = function (date = new Date()) {
  return [
    String(date.getHours()).padStart(2, "0"),

    String(date.getMinutes()).padStart(2, "0"),

    String(date.getSeconds()).padStart(2, "0"),
  ].join(":");
};

export const getPresentationOverviewSearchText = function (slideState, index) {
  const parts = [
    String(index + 1),
    slideState.label ?? "",
    slideState.imagePath ?? "",
  ];

  return parts.join(" ").toLowerCase();
};
