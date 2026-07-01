/** JSON Schema for a single DummyJSON product — used for response schema validation. */
export const productSchema = {
  type: 'object',
  required: ['id', 'title', 'price', 'category', 'stock', 'rating'],
  properties: {
    id: { type: 'integer' },
    title: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string' },
    price: { type: 'number' },
    discountPercentage: { type: 'number' },
    rating: { type: 'number' },
    stock: { type: 'integer' },
    tags: { type: 'array', items: { type: 'string' } },
    brand: { type: 'string' },
    sku: { type: 'string' },
  },
  additionalProperties: true,
} as const;

export const loginResponseSchema = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'id', 'username', 'email'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    id: { type: 'integer' },
    username: { type: 'string' },
    email: { type: 'string' },
  },
  additionalProperties: true,
} as const;
