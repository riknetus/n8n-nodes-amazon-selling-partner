// Make axios a callable mock function that proxies to axiosMock.request
const axiosMock: any = jest.fn((config?: any) => axiosMock.request(config));

axiosMock.request = jest.fn();
axiosMock.get = jest.fn();
axiosMock.post = jest.fn();
axiosMock.put = jest.fn();
axiosMock.delete = jest.fn();
axiosMock.patch = jest.fn();
axiosMock.head = jest.fn();
axiosMock.options = jest.fn();

axiosMock.create = () => axiosMock;
axiosMock.defaults = {
  baseURL: '',
  timeout: 0,
  headers: {},
};
axiosMock.interceptors = {
  request: {
    use: jest.fn(),
    eject: jest.fn(),
  },
  response: {
    use: jest.fn(),
    eject: jest.fn(),
  },
};

// Provide isAxiosError helper similar to real axios
axiosMock.isAxiosError = (err: any) => !!(err && err.isAxiosError);

export default axiosMock;
