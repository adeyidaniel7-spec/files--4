export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const relayerKey = process.env.RELAYER_PRIVATE_KEY;

  return res.status(200).json({
    status: 'ok',
    relayerConfigured: !!relayerKey,
    relayerKeyExists: !!relayerKey,
    env: Object.keys(process.env).filter(k => k.includes('RELAY') || k.includes('RECEIVER')).reduce((acc, key) => {
      acc[key] = process.env[key] ? 'SET' : 'NOT_SET';
      return acc;
    }, {})
  });
}
