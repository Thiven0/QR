const { Schema, model } = require("mongoose");

const VISITOR_TICKET_TTL_MINUTES = Number(process.env.VISITOR_TICKET_TTL_MINUTES || 10);

const VisitorTicketSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expireAfterSeconds: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// NOTE: Ajusta VISITOR_TICKET_TTL_MINUTES segun necesidades antes de desplegar a produccion.
VisitorTicketSchema.statics.getTicketTtlMinutes = function getTicketTtlMinutes() {
  return VISITOR_TICKET_TTL_MINUTES;
};

module.exports = model("VisitorTicket", VisitorTicketSchema, "visitor_tickets");
