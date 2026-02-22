// backend/src/config/validateEnv.ts
export const validateEnv = () => {
  const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    console.warn(
      `⚠️  Warning: Missing environment variables: ${missingEnvVars.join(', ')}`
    );
  }

  console.log(`🔧 Config: PORT=${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV}`);
};
