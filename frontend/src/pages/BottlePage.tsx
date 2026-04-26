import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { feedApi } from "@/services/api";
import { Loader2, Baby } from "lucide-react";
import { getTwinColorClasses } from "@/lib/twinColors";
import type { FeedSession } from "@/types";

function BottlePage() {
  const { settings } = useSettings();
  const [selectedTwin, setSelectedTwin] = useState<"A" | "B">("A");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const twinAName = settings?.twin_a_name || "Twin A";
  const twinBName = settings?.twin_b_name || "Twin B";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const session: Omit<FeedSession, "id" | "created_at" | "updated_at"> = {
        twin: selectedTwin,
        is_bottle: true,
        bottle_amount: amountNum,
        bottle_type: "formula",
        events: [],
      };

      await feedApi.createSession(session);
      setAmount("");
      alert("Bottle feed recorded successfully!");
    } catch (error) {
      console.error("Failed to record bottle feed:", error);
      alert("Failed to record bottle feed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          🍼 Bottle Feed
        </h1>
        <p className="text-muted-foreground">
          Record bottle feeding for your twins
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Record Bottle Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="twin">Twin</Label>
              <Select
                value={selectedTwin}
                onValueChange={(value: "A" | "B") => setSelectedTwin(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getTwinColorClasses("A")}`}
                      />
                      {twinAName}
                    </div>
                  </SelectItem>
                  <SelectItem value="B">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getTwinColorClasses("B")}`}
                      />
                      {twinBName}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ml)</Label>
              <Input
                id="amount"
                type="number"
                step="10"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount in milliliters"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Bottle Feed"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default BottlePage;
