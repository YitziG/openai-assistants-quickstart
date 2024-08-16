import * as React from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"

const EventLog = ({ logs }) => {
  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <Accordion type="single" collapsible className="w-full">
        {logs.map((log, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-sm">
              {log.event}
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollArea>
  )
}

export { EventLog }