const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { PrismaClient } = require('@prisma/client');
const { gql } = require('graphql-tag');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const typeDefs = gql(fs.readFileSync(path.join(__dirname, 'products.graphql'), 'utf8'));

require('dotenv').config();

const resolvers = {
    Query: {
        getProduct: async (_, { id }) => {
            return prisma.product.findUnique({
                where: { id: BigInt(id) },
                include: {
                    ProductPricing: true,
                    ProductInventory: true,
                    Supplier: {
                        include: {
                            SupplierContact: true
                        }
                    }
                }
            });
        },
        listProducts: async () => {
            return prisma.product.findMany({
                include: {
                    ProductPricing: true,
                    ProductInventory: true,
                    Supplier: {
                        include: {
                            SupplierContact: true
                        }
                    }
                }
            });
        },
        productsByCategory: async (_, { category }) => {
            return prisma.product.findMany({
                where: { category },
                include: {
                    ProductPricing: true,
                    ProductInventory: true,
                    Supplier: {
                        include: {
                            SupplierContact: true
                        }
                    }
                }
            });
        }
    },
    Mutation: {
        createProduct: async (_, args) => {
            const { listPrice, discount, currency, stock, warehouseLocation, reorderLevel, ...productData } = args;
            return prisma.product.create({
                data: {
                    ...productData,
                    ProductPricing: {
                        create: {
                            listPrice,
                            discount: discount || 0,
                            netPrice: listPrice - (discount || 0),
                            currency
                        }
                    },
                    ProductInventory: {
                        create: {
                            stock,
                            warehouseLocation,
                            reorderLevel
                        }
                    }
                },
                include: {
                    ProductPricing: true,
                    ProductInventory: true,
                    Supplier: {
                        include: {
                            SupplierContact: true
                        }
                    }
                }
            });
        },
        updateProduct: async (_, args) => {
            const { id, listPrice, discount, currency, stock, warehouseLocation, reorderLevel, ...productData } = args;
            return prisma.product.update({
                where: { id: BigInt(id) },
                data: {
                    ...productData,
                    ...(listPrice && {
                        ProductPricing: {
                            update: {
                                listPrice,
                                discount: discount || 0,
                                netPrice: listPrice - (discount || 0),
                                currency
                            }
                        }
                    }),
                    ...(stock && {
                        ProductInventory: {
                            update: { stock, warehouseLocation, reorderLevel }
                        }
                    })
                },
                include: {
                    ProductPricing: true,
                    ProductInventory: true,
                    Supplier: {
                        include: {
                            SupplierContact: true
                        }
                    }
                }
            });
        },
        deleteProduct: async (_, { id }) => {
            await prisma.product.delete({
                where: { id: BigInt(id) }
            });
            return true;
        },
    },
    Product: {
        __resolveReference: async (reference) => {
            return prisma.product.findUnique({
                where: { id: BigInt(reference.id) },
                include: {
                    ProductPricing: true,
                    ProductInventory: true,
                    Supplier: {
                        include: {
                            SupplierContact: true
                        }
                    }
                }
            });
        },
        id: (parent) => parent.id.toString(),
        supplier: (parent) => parent.Supplier,
        pricing: (parent) => parent.ProductPricing,
        inventory: (parent) => parent.ProductInventory
    },
    Supplier: {
        id: (parent) => parent.id.toString(),
        contact: (parent) => parent.SupplierContact
    }
};

const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

async function startProductService() {
    const server = new ApolloServer({ schema });
    const { url } = await startStandaloneServer(server, {
        listen: { port: process.env.PRISMAPORT || 4001 }
    });
    console.log(`🚀 Product Service ready at ${url}`);
}

startProductService();