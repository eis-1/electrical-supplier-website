import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PageContainer } from "@components/layout/PageContainer";
import Home from "@pages/Home/Home";
import Products from "@pages/Products/Products";
import ProductDetails from "@pages/ProductDetails/ProductDetails";
import Brands from "@pages/Brands/Brands";
import Quote from "@pages/Quote/Quote";
import About from "@pages/About/About";
import Contact from "@pages/Contact/Contact";
import Projects from "@pages/Projects/Projects";
import AdminLogin from "@pages/Admin/AdminLogin";
import AdminDashboard from "@pages/Admin/AdminDashboard";
import AdminProducts from "@pages/Admin/AdminProducts";
import AdminQuotes from "@pages/Admin/AdminQuotes";
import AdminCategories from "@pages/Admin/AdminCategories";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Routes - No layout */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/quotes" element={<AdminQuotes />} />
        <Route path="/admin/categories" element={<AdminCategories />} />

        {/* Public Routes - With layout */}
        <Route
          path="/"
          element={
            <PageContainer>
              <Home />
            </PageContainer>
          }
        />
        <Route
          path="/products"
          element={
            <PageContainer>
              <Products />
            </PageContainer>
          }
        />
        <Route
          path="/products/:slug"
          element={
            <PageContainer>
              <ProductDetails />
            </PageContainer>
          }
        />
        <Route
          path="/brands"
          element={
            <PageContainer>
              <Brands />
            </PageContainer>
          }
        />
        <Route
          path="/projects"
          element={
            <PageContainer>
              <Projects />
            </PageContainer>
          }
        />
        <Route
          path="/quote"
          element={
            <PageContainer>
              <Quote />
            </PageContainer>
          }
        />
        <Route
          path="/about"
          element={
            <PageContainer>
              <About />
            </PageContainer>
          }
        />
        <Route
          path="/contact"
          element={
            <PageContainer>
              <Contact />
            </PageContainer>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};
