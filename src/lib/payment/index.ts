import type { PaymentProvider } from "./PaymentProvider.interface";
import { StripeAdapter } from "./adapters/StripeAdapter";

const providers: Record<string, () => PaymentProvider> = {
  stripe: () => new StripeAdapter(),
};

export function getPaymentProvider(): PaymentProvider {
  const selectedProvider = (process.env.PAYMENT_PROVIDER ?? "stripe").toLowerCase();
  const providerFactory = providers[selectedProvider];

  if (!providerFactory) {
    throw new Error(
      `PAYMENT_PROVIDER invalido: ${selectedProvider}. Providers suportados: ${Object.keys(providers).join(", ")}`
    );
  }

  return providerFactory();
}
