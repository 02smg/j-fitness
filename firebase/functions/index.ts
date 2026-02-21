import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import Stripe from 'stripe'

admin.initializeApp()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' })

exports.stripeWebhook = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
    } else {
      event = req.body
    }
  } catch (err: any) {
    console.error('Webhook error:', err)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const metadata = session.metadata || {}
    const uid = metadata.uid

    if (uid) {
      // Example: write purchase record to Firestore
      const db = admin.firestore()
      await db.collection('purchases').add({
        uid,
        sessionId: session.id,
        customer: session.customer,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  }

  res.json({ received: true })
})
