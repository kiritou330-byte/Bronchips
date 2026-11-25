// Music configuration.
// 1. Put your song in /public/audio/ (mp3 recommended).
// 2. Set `src` to "/audio/<file-name>".
// If the file is missing, the player and the soundtrack button are hidden automatically.

export const music = {
  src: "/audio/chelsea-song.mp3",
  title: "Count on Me",
  artist: "Bruno Mars",
  enabled: true,
  /** 0..1 */
  volume: 0.35,
  /** Seconds for fade in / fade out when playing or pausing. */
  fade: 1.6,
  /** Let particles and flowers react very gently to the music. */
  reactive: true,
};
