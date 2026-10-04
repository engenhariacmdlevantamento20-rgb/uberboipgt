export const STATUS_LABEL: Record<string, string> = {
  published: "Publicada", awarded: "Transportador escolhido",
  documentation: "Documentação", scheduled: "Agendado", arrived_origin: "Chegou para embarque",
  loading: "Embarque", in_transit: "Em trânsito", arrived_dest: "Chegou ao destino",
  unloading: "Desembarque", completed: "Concluído", cancelled: "Cancelado",
};

/** Próximo passo permitido a partir de cada status. */
export const FLOW: Record<string, { to: string; label: string; who: "transporter" | "both" }> = {
  documentation: { to: "scheduled", label: "Confirmar agendamento", who: "both" },
  scheduled: { to: "arrived_origin", label: "Cheguei para embarque", who: "transporter" },
  arrived_origin: { to: "loading", label: "Iniciar embarque", who: "transporter" },
  loading: { to: "in_transit", label: "Sair com carga", who: "transporter" },
  in_transit: { to: "arrived_dest", label: "Cheguei ao destino", who: "transporter" },
  arrived_dest: { to: "unloading", label: "Iniciar desembarque", who: "transporter" },
  unloading: { to: "completed", label: "Finalizar transporte", who: "transporter" },
};

export const CATEGORIES: Record<string, string> = {
  boi: "Boi", vaca: "Vaca", novilha: "Novilha", bezerro: "Bezerro", bezerra: "Bezerra", touro: "Touro",
};
