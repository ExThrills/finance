"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api-client";

export function PlaidLinkButton() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const data = await fetchJson<{ link_token: string }>("/api/plaid/link-token", {
          method: "POST",
        });
        setLinkToken(data.link_token);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to prepare Plaid Link.";
        toast.error(message);
      }
    };

    loadToken();
  }, []);

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setLoading(true);
    try {
      await fetchJson("/api/plaid/exchange-token", {
        method: "POST",
        body: JSON.stringify({
          public_token: publicToken,
          institution: metadata?.institution ?? null,
        }),
      });

      await fetchJson("/api/plaid/sync", { method: "POST" });
      toast.success("Accounts connected and synced.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to finish Plaid sync.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess,
  });

  return (
    <Button type="button" variant="outline" onClick={() => open()} disabled={!ready || loading}>
      {loading ? "Connecting..." : "Connect with Plaid"}
    </Button>
  );
}
