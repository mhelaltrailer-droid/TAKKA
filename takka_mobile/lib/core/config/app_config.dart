class AppConfig {
  static const clerkPublishableKey =
      String.fromEnvironment('CLERK_PUBLISHABLE_KEY');

  static const apiBaseUrl = String.fromEnvironment(
    'TAKKA_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const pusherKey = String.fromEnvironment('PUSHER_KEY');
  static const pusherCluster = String.fromEnvironment(
    'PUSHER_CLUSTER',
    defaultValue: 'eu',
  );

  static bool get hasClerkKey => clerkPublishableKey.isNotEmpty;
  static bool get hasPusher => pusherKey.isNotEmpty;
}
