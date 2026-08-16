# Soundscape audio

Drop the five files in this folder, named exactly as below. The names are the
ids in `src/content/soundscape.ts` — the code finds them by name, so a typo is a
soundscape that silently never appears.

| File | What it is |
| --- | --- |
| `rain.mp3` | Steady rain, ideally against a window or a roof |
| `fire.mp3` | A fireplace or wood stove — crackle and settle |
| `cafe.mp3` | A room with people in it. Low chatter, cups, no music |
| `waves.mp3` | A shoreline. Slow sets, not a storm |
| `night.mp3` | Crickets and the odd distant thing. Quiet |

You do not have to supply all five at once. The picker draws whichever files are
present and ignores the rest, so you can start with one and add the others later
— see `src/session/soundscape/audio.ts`, which is the one file that has to know
they exist.

## Length: 3 minutes each

Anywhere from **2:45 to 3:15** is fine. It does not have to be exact — the app
reads the real duration off the file and paces its progress bar from that, so a
file that runs 3:07 is simply a 3:07 exercise.

The reason it can be that loose is the reason it has to be that long: **these
never loop.** Seamless looping of compressed audio is unreliable on both iOS and
Android — MP3 carries encoder padding at both ends, so a loop point lands as an
audible gap or click, and no amount of careful editing on your side removes it.
So the clip plays once, start to finish, and the end of the file *is* the end of
the exercise. That means the file has to be as long as you want the exercise to
be, and it means you never have to think about loop points.

## Format

| | |
| --- | --- |
| Codec | MP3 |
| Bitrate | 128 kbps CBR |
| Sample rate | 44.1 kHz |
| Channels | Stereo |
| Size | ~2.9 MB per file, ~15 MB for all five |

Stereo is worth the bytes here — a mono rain bed sits flat in the middle of your
head, and width is most of what makes ambience feel like a room rather than a
recording.

## Two things to get right in the export

**No fades.** Start and end at full level. The app does its own fade in and fade
out (`SOUNDSCAPE.fadeMs`), and it has to, because the user can stop early — a
fade baked into the file only helps the one ending out of two that happens on
schedule. If you fade the file as well you get a double fade at the end and a
noticeably slow start.

**Match the loudness across all five.** Normalise to about **-16 LUFS
integrated**, with true peak no higher than **-3 dBFS**. This is the one thing
that will be obvious if it is wrong: someone switches from the fire to the rain,
the rain is 6 dB louder, and the app just startled a person who opened it
because they were anxious. Anything that levels to a target — Audacity's Loudness
Normalization, ffmpeg's `loudnorm`, Auphonic — will do it.

If you have ffmpeg, this does both at once:

```sh
ffmpeg -i source.wav -af loudnorm=I=-16:TP=-3:LRA=11 \
  -codec:a libmp3lame -b:a 128k -ar 44100 -ac 2 rain.mp3
```

## Sourcing

If these are licensed rather than recorded, keep the licence terms with them —
anything CC0 or an outright commercial licence is safe. Avoid CC-BY unless you
are prepared to carry the attribution in the app, which there is currently
nowhere to put.
