import jwt from "jsonwebtoken";
import User from "../models/User.js";

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      facilityId: user.facilityId || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    nationalId: user.nationalId || null,
    facilityId: user.facilityId || null,
    pharmacyProfileId: user.pharmacyProfileId || null,
    insuranceStatus: user.insuranceStatus || null,
    createdAt: user.createdAt,
  };
}

export async function register(req, res) {
  try {
    const {
      email,
      password,
      role,
      name,
      nationalId,
      facilityId,
      insuranceStatus,
      fullName,
      pharmacyProfileId,
    } = req.body;

    const existingUser = await User.findOne({ email: email?.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const user = await User.create({
      email,
      fullName: fullName || name,
      password,
      role,
      nationalId: role === "patient" ? nationalId : undefined,
      facilityId:
        role === "pharmacy" || role === "insurer" || role === "receptionist"
          ? facilityId
          : undefined,
      pharmacyProfileId: role === "pharmacy" ? pharmacyProfileId : undefined,
      insuranceStatus: role === "patient" ? insuranceStatus || "active" : undefined,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to register user" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: "Account does not belong to this portal" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Unable to log in" });
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: sanitizeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Unable to fetch profile" });
  }
}
