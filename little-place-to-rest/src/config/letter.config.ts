// The letter inside the cottage. Edit the text here — paragraphs are separated by blank lines.

export const letter = {
  salutation: "Dear Chel,",
  body: `I don't know how your day has been.

Maybe today was tiring.
Maybe things didn't go the way you wanted.
Maybe you just need a little time for yourself.

I want you to know that you don't have to be perfect.

You don't have to get everything right.
You don't have to be strong every single day.

I hope you remember that even on difficult days, you are still someone worth appreciating.

I hope tomorrow brings you something a little softer.

Take your time, okay?`,
  closing: "With warmth.",
  closeLabel: "Close this letter",
  /**
   * A song at the very end of the letter, played through YouTube's own embedded player
   * (privacy-enhanced youtube-nocookie domain). Set to null to remove it.
   */
  song: {
    youtubeId: "R533DDds3RY",
    title: "Count on Me",
    artist: "Bruno Mars",
    label: "P.S. — a song for you",
  } as { youtubeId: string; title: string; artist: string; label: string } | null,
};
