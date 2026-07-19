plugins {
    id("com.android.application")
}

android {
    namespace = "com.mpoc.watchface"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.mpoc.watchface"
        // Pixel Watch 2 ships Wear OS 4 (API 33), which supports Watch Face Format v1
        minSdk = 33
        targetSdk = 33
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
