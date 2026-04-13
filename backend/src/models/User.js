import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const allowedRoles = ["patient", "pharmacy", "insurer", "regulator", "receptionist"];
const insuranceStatuses = ["active", "inactive"];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: allowedRoles,
      required: true,
    },
    nationalId: {
      type: String,
      trim: true,
      required() {
        return this.role === "patient";
      },
    },
    facilityId: {
      type: String,
      trim: true,
      required() {
        return (
          this.role === "pharmacy" ||
          this.role === "insurer" ||
          this.role === "receptionist"
        );
      },
    },
    pharmacyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
    },
    insuranceStatus: {
      type: String,
      enum: insuranceStatuses,
      default() {
        return this.role === "patient" ? "active" : undefined;
      },
      required() {
        return this.role === "patient";
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
