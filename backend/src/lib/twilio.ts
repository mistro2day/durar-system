
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = async (to: string, bodyOrSid: string, contentVariables?: Record<string, string>) => {
    if (!accountSid || !authToken || !fromNumber) {
        console.warn("Twilio credentials missing. Skipping WhatsApp message.");
        return null;
    }

    try {
        let formattedTo = to.trim().replace(/\s/g, ""); // Remove spaces

        // Fix common Saudi format issues
        if (formattedTo.startsWith("05")) {
            formattedTo = "+966" + formattedTo.substring(1);
        } else if (formattedTo.startsWith("5") && formattedTo.length === 9) {
            formattedTo = "+966" + formattedTo;
        }

        if (!formattedTo.startsWith("whatsapp:")) {
            formattedTo = `whatsapp:${formattedTo}`;
        }

        console.log(`Sending WhatsApp to: ${formattedTo}`);

        const messageOptions: any = {
            from: fromNumber,
            to: formattedTo,
        };

        if (contentVariables) {
            messageOptions.contentSid = bodyOrSid;
            messageOptions.contentVariables = JSON.stringify(contentVariables);
        } else {
            messageOptions.body = bodyOrSid;
        }

        const message = await client.messages.create(messageOptions);

        console.log(`WhatsApp message sent: ${message.sid}`);
        return message;
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
};
