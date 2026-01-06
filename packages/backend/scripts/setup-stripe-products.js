/**
 * Stripe Product Setup Script
 * Creates the three subscription tiers with weekly billing
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
});

async function setupProducts() {
  console.log('🔧 Setting up Stripe products and prices...\n');

  try {
    // Define the three subscription tiers
    const tiers = [
      {
        name: 'Starter Plan',
        description: 'Perfect for small businesses getting started with AI calling',
        price: 999, // $9.99 in cents
        limits: '50 minutes, 100 SMS, 200 contacts per week',
      },
      {
        name: 'Pro Plan',
        description: 'For growing businesses with higher call volumes',
        price: 1999, // $19.99 in cents
        limits: '150 minutes, 300 SMS, 500 contacts per week',
      },
      {
        name: 'Max Plan',
        description: 'Enterprise-grade solution for maximum capacity',
        price: 3999, // $39.99 in cents
        limits: '500 minutes, 1000 SMS, unlimited contacts per week',
      },
    ];

    const priceIds = {};

    for (const tier of tiers) {
      console.log(`Creating ${tier.name}...`);

      // Create the product
      const product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: {
          limits: tier.limits,
        },
      });

      console.log(`  ✅ Product created: ${product.id}`);

      // Create the recurring price with weekly billing
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: 'usd',
        recurring: {
          interval: 'week',
          trial_period_days: 14, // 14-day free trial
        },
        metadata: {
          plan_name: tier.name,
        },
      });

      console.log(`  ✅ Price created: ${price.id} ($${tier.price / 100}/week)\n`);

      // Store price IDs by plan name
      const planKey = tier.name.split(' ')[0].toUpperCase(); // STARTER, PRO, MAX
      priceIds[planKey] = price.id;
    }

    // Output the environment variables
    console.log('✨ All products created successfully!\n');
    console.log('📋 Add these to your .env file:\n');
    console.log(`STRIPE_PRICE_STARTER=${priceIds.STARTER}`);
    console.log(`STRIPE_PRICE_PRO=${priceIds.PRO}`);
    console.log(`STRIPE_PRICE_MAX=${priceIds.MAX}`);
    console.log('\n');

    return priceIds;
  } catch (error) {
    console.error('❌ Error setting up products:', error.message);
    throw error;
  }
}

// Run the setup
setupProducts()
  .then((priceIds) => {
    console.log('🎉 Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to setup products:', error);
    process.exit(1);
  });
