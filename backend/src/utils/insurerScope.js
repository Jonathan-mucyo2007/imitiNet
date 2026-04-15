import InsuranceProvider from "../models/InsuranceProvider.js";
import User from "../models/User.js";

export async function resolveInsurerScopeByUserId(userId) {
  const insurerUser = await User.findById(userId).populate(
    "insuranceProviderId",
    "name umbrellaCode isUmbrellaProvider parentProviderId"
  );

  if (!insurerUser || insurerUser.role !== "insurer") {
    return {
      error: { status: 403, message: "Only insurers can access this resource." },
    };
  }

  if (!insurerUser.insuranceProviderId) {
    return {
      error: { status: 403, message: "Misconfigured insurer account." },
    };
  }

  const scopedProviderIds = [insurerUser.insuranceProviderId._id];

  if (insurerUser.insuranceProviderId.isUmbrellaProvider) {
    const childProviders = await InsuranceProvider.find({
      parentProviderId: insurerUser.insuranceProviderId._id,
    }).select("_id");

    scopedProviderIds.push(...childProviders.map((provider) => provider._id));
  }

  return {
    insurerUser,
    primaryProvider: insurerUser.insuranceProviderId,
    scopedProviderIds,
  };
}
