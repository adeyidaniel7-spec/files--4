export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    message: 'Simple test API works!',
    time: new Date().toISOString(),
    relayerKeySet: !!process.env.RELAYER_PRIVATE_KEY
  });
}
