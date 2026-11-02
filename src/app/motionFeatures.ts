// Carregado sob demanda pelo LazyMotion: o bundle inicial leva só os componentes `m`, e as
// animações (domAnimation) chegam num pedaço separado, sem atrasar a primeira tela.
import { domAnimation } from "motion/react";

export default domAnimation;
