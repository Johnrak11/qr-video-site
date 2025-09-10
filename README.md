# QR Video Site
A tiny static site that autoplays a video and attempts fullscreen + landscape after scanning a QR code.

## How to use
1. Deploy this folder to Netlify (Drag-and-drop the ZIP or connect a repo).
2. Share a QR code pointing to your site with a `video` query string parameter:

### YouTube (Unlisted)
```
https://your-site.netlify.app/?video=https://youtu.be/VIDEO_ID
```
or
```
https://your-site.netlify.app/?video=https://www.youtube.com/watch?v=VIDEO_ID
```

### Vimeo
```
https://your-site.netlify.app/?video=https://vimeo.com/123456789
```
It also supports `https://vimeo.com/manage/videos/123456789`.

### Direct MP4
```
https://your-site.netlify.app/?video=https://example.com/path/movie.mp4
```

## Notes
- Mobile browsers often require **muted** autoplay; we set mute for reliability.
- True programmatic fullscreen + orientation lock may be restricted on iOS.
  The app tries automatically; if blocked, it shows a single **Tap to Play** overlay.
- Landscape lock uses the Screen Orientation API; supported mainly on Android/Chrome.
