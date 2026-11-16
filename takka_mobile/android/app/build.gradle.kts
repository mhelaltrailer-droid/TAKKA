import java.io.File
import java.util.Base64
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

fun env(name: String): String? {
    val value = System.getenv(name)?.trim()
    return if (value.isNullOrEmpty()) null else value
}

fun prop(vararg names: String): String? {
    for (name in names) {
        val value = keystoreProperties.getProperty(name)?.trim()
        if (!value.isNullOrEmpty()) return value
    }
    return null
}

fun firstNonBlank(vararg values: String?): String? {
    for (value in values) {
        if (!value.isNullOrBlank()) return value
    }
    return null
}

val buildingRelease = gradle.startParameter.taskNames.any { taskName ->
    taskName.contains("Release", ignoreCase = true)
}

val keystoreBase64 = env("KEYSTORE_BASE64")?.replace(Regex("\\s"), "")
val resolvedStorePassword = firstNonBlank(
    env("KEYSTORE_PASSWORD"),
    prop("storePassword", "KEYSTORE_PASSWORD"),
)
val resolvedKeyAlias = firstNonBlank(
    env("KEY_ALIAS"),
    prop("keyAlias", "KEY_ALIAS"),
)
val resolvedKeyPassword = firstNonBlank(
    env("KEY_PASSWORD"),
    prop("keyPassword", "KEY_PASSWORD"),
)
val keystorePath = firstNonBlank(
    env("KEYSTORE_FILE"),
    prop("storeFile", "KEYSTORE_FILE"),
)

val signingSignalsPresent = listOf(
    keystoreBase64,
    resolvedStorePassword,
    resolvedKeyAlias,
    resolvedKeyPassword,
    keystorePath,
).any { !it.isNullOrBlank() }

fun resolveStoreFile(path: String): File {
    val raw = File(path)
    if (raw.isAbsolute) {
        return raw
    }
    val fromAndroidRoot = rootProject.file(path)
    if (fromAndroidRoot.exists()) {
        return fromAndroidRoot
    }
    return file(path)
}

val releaseStoreFile: File? = try {
    when {
        !keystoreBase64.isNullOrBlank() -> {
            val bytes = Base64.getDecoder().decode(keystoreBase64)
            // takka_mobile/build is gitignored. Never commit this file.
            val out = rootProject.file("../build/takka-release.jks")
            out.parentFile?.mkdirs()
            out.writeBytes(bytes)
            out
        }
        !keystorePath.isNullOrBlank() -> resolveStoreFile(keystorePath)
        else -> null
    }
} catch (error: IllegalArgumentException) {
    if (buildingRelease) {
        throw GradleException("KEYSTORE_BASE64 is not valid Base64.", error)
    }
    null
}

val releaseSigningReady = !resolvedKeyAlias.isNullOrBlank() &&
    !resolvedStorePassword.isNullOrBlank() &&
    !resolvedKeyPassword.isNullOrBlank() &&
    releaseStoreFile != null &&
    releaseStoreFile.exists()

if (buildingRelease && signingSignalsPresent && !releaseSigningReady) {
    val reason = when {
        !keystoreBase64.isNullOrBlank() && releaseStoreFile == null ->
            "KEYSTORE_BASE64 could not be decoded"
        releaseStoreFile == null || !releaseStoreFile.exists() ->
            "keystore file is missing (set KEYSTORE_BASE64, or storeFile / KEYSTORE_FILE in android/key.properties)"
        resolvedKeyAlias.isNullOrBlank() ->
            "KEY_ALIAS / keyAlias is missing"
        resolvedStorePassword.isNullOrBlank() ->
            "KEYSTORE_PASSWORD / storePassword is missing"
        resolvedKeyPassword.isNullOrBlank() ->
            "KEY_PASSWORD / keyPassword is missing"
        else -> "release signing config is incomplete"
    }
    throw GradleException(
        "Release signing was partially configured but $reason. " +
            "Set all of KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, and KEY_PASSWORD, " +
            "or a complete android/key.properties. " +
            "Refusing to fall back to the debug key while signing inputs are present.",
    )
}

if (buildingRelease && !releaseSigningReady) {
    logger.warn("")
    logger.warn("WARNING: Release keystore is not configured. This release build will be signed with the debug key.")
    logger.warn("WARNING: Debug-signed APKs cannot be updated in place by a later upload key. Create the release keystore before the first real distribution.")
    logger.warn("WARNING: Provide android/key.properties or the env vars KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, and KEY_PASSWORD.")
    logger.warn("WARNING: See docs/release-apk.md.")
    logger.warn("")
} else if (buildingRelease && releaseSigningReady && releaseStoreFile != null) {
    logger.lifecycle("Release signing: using keystore ${releaseStoreFile.name} (alias $resolvedKeyAlias).")
}

android {
    namespace = "com.takka.app"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        // flutter_local_notifications uses Java 8+ time APIs on older devices.
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.takka.app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        val storeFileForRelease = releaseStoreFile
        if (releaseSigningReady && storeFileForRelease != null) {
            val keystoreFile: File = storeFileForRelease
            create("release") {
                keyAlias = resolvedKeyAlias
                keyPassword = resolvedKeyPassword
                storePassword = resolvedStorePassword
                storeFile = keystoreFile
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (releaseSigningReady) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

// Firebase is optional. Without this file the app builds and runs as before;
// push stays disabled until the owner adds the real config. See docs/fcm-setup.md.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}
