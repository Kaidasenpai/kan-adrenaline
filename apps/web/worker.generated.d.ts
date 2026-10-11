declare module "open-next-worker" {
  const worker: {
    fetch(
      request: Request,
      environment: unknown,
      context: unknown,
    ): Promise<Response>;
  };
  export default worker;
}
