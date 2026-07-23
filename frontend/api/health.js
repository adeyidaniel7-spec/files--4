export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  const receiverAddr = process.env.RECEIVER_ADDRESS;

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      relayerKeySet: !!relayerKey,
      relayerKeyLength: relayerKey ? relayerKey.length : 0,
      relayerKeyStart: relayerKey ? relayerKey.substring(0, 10) + '...' : 'NOT SET',
      receiverAddress: receiverAddr || 'NOT SET',
      nodeVersion: process.version,
    }
  });
}
