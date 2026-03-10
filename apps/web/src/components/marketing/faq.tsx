import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQ({ items }: FAQProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold text-foreground mb-12">
        Frequently Asked Questions
      </h2>
      <Accordion className="w-full">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-foreground">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
