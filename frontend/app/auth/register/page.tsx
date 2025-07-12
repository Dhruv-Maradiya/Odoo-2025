"use client";

import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Link,
  Divider,
} from "@heroui/react";
import { Eye, EyeOff, User, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const router = useRouter();

  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...submitData } = data;

      // Register with backend
      const response = await apiClient.register(submitData);

      if (response.access_token) {
        toast.success("Registration successful!");

        // Sign in with NextAuth using the registered credentials
        const signInResult = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Get the session to check user role
          const session = await fetch("/api/auth/session").then((res) =>
            res.json()
          );

          // Redirect based on user role
          if (session?.user?.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/");
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        toast.error("Google signup failed");
      } else if (result?.ok) {
        toast.success("Google signup successful!");
        router.push("/");
      }
    } catch (error) {
      toast.error("Google signup failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-none">
          <CardHeader className="flex flex-col items-center pb-6">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-xl font-bold">S</span>
            </div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-default-500 text-center">
              Join StackIt and start asking questions
            </p>
          </CardHeader>

          <CardBody className="px-6 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                {...register("name")}
                type="text"
                label="Full Name"
                placeholder="Enter your full name"
                isInvalid={!!errors.name}
                errorMessage={errors.name?.message}
                startContent={<User className="w-5 h-5 text-default-400" />}
                className="w-full"
              />

              <Input
                {...register("email")}
                type="email"
                label="Email"
                placeholder="Enter your email"
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
                startContent={<Mail className="w-5 h-5 text-default-400" />}
                className="w-full"
              />

              <Input
                {...register("password")}
                label="Password"
                placeholder="Create a password"
                isInvalid={!!errors.password}
                errorMessage={errors.password?.message}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                  >
                    {isVisible ? (
                      <EyeOff className="w-5 h-5 text-default-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-default-400" />
                    )}
                  </button>
                }
                type={isVisible ? "text" : "password"}
                className="w-full"
              />

              <Input
                {...register("confirmPassword")}
                label="Confirm Password"
                placeholder="Confirm your password"
                isInvalid={!!errors.confirmPassword}
                errorMessage={errors.confirmPassword?.message}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleConfirmVisibility}
                  >
                    {isConfirmVisible ? (
                      <EyeOff className="w-5 h-5 text-default-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-default-400" />
                    )}
                  </button>
                }
                type={isConfirmVisible ? "text" : "password"}
                className="w-full"
              />

              <div className="text-xs text-default-500 space-y-1">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>At least 8 characters</li>
                  <li>At least one letter</li>
                  <li>At least one number</li>
                </ul>
              </div>

              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-default-500">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
