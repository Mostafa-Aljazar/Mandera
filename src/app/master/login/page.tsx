"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import DocumentHead from "@/components/common/DocumentHead";
import { useTranslation } from "react-i18next";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import PageLoading from "@/components/common/PageLoading";
import PublicHeader from "@/components/common/PublicHeader";
import { useMasterAuth } from "@/contexts/MasterAuthContext";
import { toast } from "sonner";
import { LoginSchema, type TLoginSchema } from "@/validations/login.schema";

export default function MasterLoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const { login, initialLoading, isAuthenticated } = useMasterAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<TLoginSchema>({
    resolver: zodResolver(LoginSchema(t)),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!initialLoading && isAuthenticated) {
      router.replace("/master/dashboard");
    }
  }, [initialLoading, isAuthenticated, router]);

  const handleSubmit = form.handleSubmit(async (formData) => {
    setSubmitting(true);

    try {
      await login(formData.email, formData.password);
      router.refresh();
      router.push("/master/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("Invalid email or password"));
      setSubmitting(false);
    }
  });

  const showLoader = initialLoading || submitting || isAuthenticated;

  if (showLoader) {
    return (
      <>
        <DocumentHead title={`${t("Master admin login")} | MANDERA CRM`} description="Login to the master admin dashboard" />
        <PageLoading label={submitting ? t("Authenticating...") : undefined} />
      </>
    );
  }

  return (
    <>
      <DocumentHead title={`${t("Master admin login")} | MANDERA CRM`} description="Login to the master admin dashboard" />

      <PublicHeader />

      <div className="flex justify-center items-center bg-gradient-to-b from-muted/30 via-background to-background px-4 py-8 sm:py-12 min-h-[calc(100vh-68px)]">
        <div className="relative bg-card shadow-[var(--shadow-hover)] border border-border/60 rounded-2xl w-full max-w-md overflow-hidden">
          <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-transparent via-primary to-transparent h-1" />

          <div className="p-8 sm:p-10">
            <span className="inline-flex items-center gap-2 bg-primary/10 mb-5 px-3 py-1.5 border border-primary/15 rounded-full font-medium text-primary text-xs">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {t("master_login_badge")}
            </span>

            <div className="mb-7">
              <h1 className="font-outfit font-bold text-foreground text-xl sm:text-2xl tracking-tight">
                {t("Master admin login")}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {t("Enter your credentials to access the platform")}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">
                        {t("Email address")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="top-1/2 absolute start-3 w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                          <Input
                            type="email"
                            placeholder={t("admin@example.com")}
                            className="bg-background ps-10 border-border/80 rounded-lg h-11"
                            autoComplete="email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">
                        {t("Password")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="top-1/2 absolute start-3 w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none" />
                          <Input
                            type="password"
                            className="bg-background ps-10 border-border/80 rounded-lg h-11"
                            autoComplete="current-password"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 mt-2 rounded-lg w-full h-11 font-semibold"
                >
                  {submitting ? t("Authenticating...") : t("Sign in")}
                  {!submitting ? (
                    <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180" />
                  ) : null}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}
