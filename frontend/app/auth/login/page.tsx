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
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const router = useRouter();

  const toggleVisibility = () => setIsVisible(!isVisible);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else if (result?.ok) {
        toast.success("Login successful!");
        router.push("/");
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        toast.error("Google login failed");
      } else if (result?.ok) {
        toast.success("Google login successful!");
        router.push("/");
      }
    } catch (error) {
      toast.error("Google login failed. Please try again.");
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
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-default-500 text-center">
              Sign in to your StackIt account
            </p>
          </CardHeader>

          <CardBody className="px-6 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                {...register("email")}
                type="email"
                label="Email"
                placeholder="Enter your email"
                isInvalid={!!errors.email}
                errorMessage={errors.email?.message}
                className="w-full"
              />

              <Input
                {...register("password")}
                label="Password"
                placeholder="Enter your password"
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

              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-default-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-primary font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
