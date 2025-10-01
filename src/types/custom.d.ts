declare module 'cors' {
  const cors: any;
  export default cors;
}

declare module 'morgan' {
  const morgan: any;
  export default morgan;
}

declare module 'swagger-ui-express' {
  const serve: any;
  const setup: any;
  export { serve, setup };
}

declare module 'swagger-jsdoc' {
  const swaggerJsdoc: any;
  export default swaggerJsdoc;
} 