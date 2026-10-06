# VOYNU Customer – Android (Capacitor)

Thin native shell that loads the hosted customer app (`https://voynu.vercel.app`) in an Android WebView, so web
deploys reach the app instantly. It adds the launcher icon, splash screen, status-bar colour, back-button handling,
haptics and an offline page (`www/offline.html`).

## Build (needs JDK 21 + Android Studio / Android SDK)
```bash
cd apps/customer-android
npm install
npx cap sync android
npx cap open android          # opens Android Studio -> Run
# or from the command line:
npm run build:debug           # android/app/build/outputs/apk/debug/app-debug.apk
npm run build:release         # signed AAB for Play Store (needs a keystore, see below)
```

## Before publishing
- **Application id** is `com.voynu.customer` (permanent once on Google Play). Change `appId` in `capacitor.config.json`
  and `applicationId` in `android/app/build.gradle` first if you want a different one.
- **Release signing:** create a keystore (`keytool -genkeys ...`), keep it OUT of git (`*.jks`/`*.keystore` are ignored)
  and back it up; losing it means you cannot update the app.
- **Push notifications:** the web-push used on the website does not work inside an Android WebView. Native push needs
  Firebase Cloud Messaging (`@capacitor/push-notifications` + `google-services.json`) and a small server change.
- **Google Maps key:** make sure the key's allowed referrers include `https://voynu.vercel.app` (the app loads from there).
- Change the loaded URL in `capacitor.config.json` (`server.url`) if you add a custom domain.
