import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jaykishan.liferpg',

  appName: 'Life Easy TODO APP',

  webDir: 'out',

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,

      providers: [
        'google.com',
      ],
    },
  },
};

export default config;