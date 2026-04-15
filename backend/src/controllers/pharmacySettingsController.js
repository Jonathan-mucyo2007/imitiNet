import User from "../models/User.js";
import PharmacyProfile from "../models/PharmacyProfile.js";

function normalizeCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [lng, lat],
  };
}

function buildSettingsPayload(profile, user) {
  const [longitude = null, latitude = null] = profile.location?.coordinates || [];

  return {
    id: profile._id,
    userId: profile.userId || user._id,
    facilityName: profile.facilityName || profile.name || "",
    tinNumber: profile.tinNumber || "",
    contactPhone: profile.contactPhone || profile.contact || "",
    contactEmail: profile.contactEmail || user.email || "",
    address: profile.address || "",
    location: {
      latitude,
      longitude,
    },
    notificationPreferences: {
      emailOnClaimRejected:
        profile.notificationPreferences?.emailOnClaimRejected ?? true,
      emailOnAiFlagged: profile.notificationPreferences?.emailOnAiFlagged ?? true,
    },
    updatedAt: profile.updatedAt,
  };
}

async function resolveOrCreatePharmacyProfile(userId) {
  const user = await User.findById(userId).select(
    "fullName email role pharmacyProfileId facilityId location"
  );

  if (!user || user.role !== "pharmacy") {
    return { error: { status: 404, message: "Pharmacy account not found." } };
  }

  let profile = null;

  if (user.pharmacyProfileId) {
    profile = await PharmacyProfile.findById(user.pharmacyProfileId);
  }

  if (!profile) {
    profile = await PharmacyProfile.findOne({ userId: user._id });
  }

  if (!profile) {
    profile = await PharmacyProfile.create({
      userId: user._id,
      facilityName: user.facilityId || user.fullName,
      name: user.facilityId || user.fullName,
      tinNumber: "",
      contactPhone: "",
      contactEmail: user.email,
      address: "",
      contact: "",
      rating: 0,
      location: user.location || { type: "Point", coordinates: [30.0619, -1.9441] },
      notificationPreferences: {
        emailOnClaimRejected: true,
        emailOnAiFlagged: true,
      },
    });

    user.pharmacyProfileId = profile._id;
    if (profile.location) {
      user.location = profile.location;
    }
    await user.save();
  } else if (!profile.userId) {
    profile.userId = user._id;
    await profile.save();
  }

  return { user, profile };
}

export async function getPharmacySettings(req, res) {
  try {
    const resolved = await resolveOrCreatePharmacyProfile(req.user.id);

    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    return res.status(200).json(buildSettingsPayload(resolved.profile, resolved.user));
  } catch (error) {
    console.error("Failed to load pharmacy settings", error);
    return res.status(500).json({ message: "Unable to load pharmacy settings right now." });
  }
}

export async function updatePharmacySettings(req, res) {
  try {
    const resolved = await resolveOrCreatePharmacyProfile(req.user.id);

    if (resolved.error) {
      return res.status(resolved.error.status).json({ message: resolved.error.message });
    }

    const {
      facilityName,
      tinNumber,
      contactPhone,
      contactEmail,
      address = "",
      location,
      notificationPreferences,
    } = req.body;

    const normalizedLocation = normalizeCoordinates(
      location?.latitude,
      location?.longitude
    );

    if (!String(facilityName || "").trim()) {
      return res.status(400).json({ message: "Facility name is required." });
    }

    if (!String(contactPhone || "").trim()) {
      return res.status(400).json({ message: "Contact phone is required." });
    }

    if (!String(contactEmail || "").trim()) {
      return res.status(400).json({ message: "Contact email is required." });
    }

    if (!normalizedLocation) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }

    resolved.profile.userId = resolved.user._id;
    resolved.profile.facilityName = String(facilityName).trim();
    resolved.profile.name = resolved.profile.facilityName;
    resolved.profile.tinNumber = String(tinNumber || "").trim();
    resolved.profile.contactPhone = String(contactPhone).trim();
    resolved.profile.contact = resolved.profile.contactPhone;
    resolved.profile.contactEmail = String(contactEmail).trim().toLowerCase();
    resolved.profile.address = String(address || "").trim();
    resolved.profile.location = normalizedLocation;
    resolved.profile.notificationPreferences = {
      emailOnClaimRejected:
        notificationPreferences?.emailOnClaimRejected ?? true,
      emailOnAiFlagged: notificationPreferences?.emailOnAiFlagged ?? true,
    };

    await resolved.profile.save();

    resolved.user.location = normalizedLocation;
    resolved.user.pharmacyProfileId = resolved.profile._id;
    await resolved.user.save();

    return res.status(200).json({
      message: "Pharmacy settings updated successfully.",
      settings: buildSettingsPayload(resolved.profile, resolved.user),
    });
  } catch (error) {
    console.error("Failed to update pharmacy settings", error);
    return res.status(500).json({ message: "Unable to update pharmacy settings right now." });
  }
}
