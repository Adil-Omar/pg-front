import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router";
import { IoMdArrowForward } from "react-icons/io";
import { IoArrowBackOutline } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import { IoCartOutline } from "react-icons/io5";
import { FaCheck } from "react-icons/fa6";
import { addToCart } from "../../redux/slices/cartSlice";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { useDispatch } from "react-redux";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { AppContext } from "../../context/AppContext";
import noimage from "/noimage.png";
import DescripTabs from "./DescriptionTabs/DescripTabs";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    backednUrl,
    token,
    fetchProducts,
    skeletonLoading,
    error,
    marginApi,
    totalDiscount,
  } = useContext(AppContext);
  const [single_product, setSingle_Product] = useState(null);

  const fetchSingleProduct = async () => {
    try {
      const { data } = await axios.get(
        `${backednUrl}/api/single-product/${id}`
      );
      if (data) {
        setSingle_Product(data.data, "fetchSingleProduct");
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchSingleProduct();
  }, [id]);

  useEffect(() => {
    const loadProducts = async () => {
      await fetchProducts();
    };
    loadProducts();
  }, []);

  const product = single_product?.product || {};
  const productId = single_product?.meta?.id || "";

  const dispatch = useDispatch();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFile2, setSelectedFile2] = useState(null);
  const [previewImage2, setPreviewImage2] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    delivery: "",
    comment: "",
    // file: selectedFile2,
  });
  const [activeImage, setActiveImage] = useState(
    product?.images?.[0] || noimage
  );
  const [logoColor, setLogoColor] = useState("1 Colour Print");

  const [selectedPrintMethod, setSelectedPrintMethod] = useState(null);
  const [availablePriceGroups, setAvailablePriceGroups] = useState([]);

  const [freightFee, setFreightFee] = useState(0);

  // const [currentPrice, setCurrentPrice] = useState(0);
  const priceGroups = product?.prices?.price_groups || [];
  const basePrice = priceGroups.find((group) => group?.base_price) || {};
  const priceBreaks = basePrice.base_price?.price_breaks || [];
  const originalPrice =
    priceBreaks.length > 0 && priceBreaks[0]?.price !== undefined
      ? parseFloat(priceBreaks[0].price)
      : 0;

  // Sort price breaks by quantity (just in case they're not in order)
  const sortedPriceBreaks = [...priceBreaks].sort((a, b) => a.qty - b.qty);

  // Find the price for a given quantity
  const getPriceForQuantity = (quantity) => {
    // Start with the highest quantity price and work backwards
    for (let i = sortedPriceBreaks.length - 1; i >= 0; i--) {
      if (quantity >= sortedPriceBreaks[i].qty) {
        return sortedPriceBreaks[i].price;
      }
    }
    // If quantity is less than the smallest break, use the smallest break price
    return sortedPriceBreaks[0]?.price || 0;
  };

  const [currentQuantity, setCurrentQuantity] = useState(
    sortedPriceBreaks[0]?.qty || 50
  );
  const [unitPrice, setUnitPrice] = useState(sortedPriceBreaks[0]?.price || 0);
  const [currentPrice, setCurrentPrice] = useState(
    sortedPriceBreaks[0]
      ? sortedPriceBreaks[0].price * sortedPriceBreaks[0].qty
      : 0
  );

  const marginEntry = marginApi[productId] || { marginFlat: 0 };
  const perUnitWithMargin = unitPrice + marginEntry.marginFlat;

  const discountPct = totalDiscount[productId] || 0;
  const discountMultiplier = 1 - discountPct / 100;

  useEffect(() => {
    if (priceGroups.length > 0) {
      const baseGroup = {
        ...priceGroups[0].base_price,
        type: "base",
        description: priceGroups[0].base_price.description || "Base Price",
      };

      const additionGroups = priceGroups.flatMap((group) =>
        group.additions.map((add) => ({
          ...add,
          type: "addition",
          description: add.description,
        }))
      );

      const allGroups = [baseGroup, ...additionGroups];
      setAvailablePriceGroups(allGroups);
      setSelectedPrintMethod(allGroups[0]);

      // Initialize quantity and price based on first price break
      if (allGroups[0]?.price_breaks?.length > 0) {
        const firstBreak = allGroups[0].price_breaks[0];
        setCurrentQuantity(firstBreak.qty);
        setUnitPrice(firstBreak.price);
        setCurrentPrice(
          firstBreak.price * firstBreak.qty +
            (allGroups[0].setup || 0) +
            freightFee
        );
      }
    }
  }, [priceGroups]);

  useEffect(() => {
    if (product) {
      const hasColors = product?.colours?.list?.length > 0;

      if (hasColors) {
        const firstColor = product.colours.list[0].colours[0];
        setSelectedColor(firstColor);
        setActiveImage(
          colorImages[firstColor] || product.images?.[0] || noimage
        );
      } else {
        // Product has no colors - use first product image
        setActiveImage(product.images?.[0] || noimage);
      }
    }
  }, [product]);

  useEffect(() => {
    if (!selectedPrintMethod?.price_breaks?.length) return;

    const sortedBreaks = [...selectedPrintMethod.price_breaks].sort(
      (a, b) => a.qty - b.qty
    );
    const minQuantity = sortedBreaks[0].qty;

    let selectedBreak = sortedBreaks[0];
    let newActiveIndex = 0;

    if (currentQuantity >= minQuantity) {
      for (let i = 0; i < sortedBreaks.length; i++) {
        if (currentQuantity >= sortedBreaks[i].qty) {
          selectedBreak = sortedBreaks[i];
          newActiveIndex = i;
        } else {
          break;
        }
      }
    }

    setActiveIndex(newActiveIndex);

    // Get the base product price for the current quantity
    const baseProductPrice = getPriceForQuantity(currentQuantity);

    // Calculate the final unit price
    let finalUnitPrice;
    if (selectedPrintMethod.type === "base") {
      // If it's the base price group, use the decoration price directly
      finalUnitPrice = selectedBreak.price;
    } else {
      // If it's an addition (decoration), add decoration price to base product price
      finalUnitPrice = baseProductPrice + selectedBreak.price;
    }

    setUnitPrice(finalUnitPrice);

    // Calculate pricing with margin and discount
    const marginEntry = marginApi[productId] || { marginFlat: 0 };
    const rawPerUnit = finalUnitPrice + marginEntry.marginFlat;
    const discountedPerUnit = rawPerUnit * (1 - discountPct / 100);

    // Calculate total: (discounted per-unit × qty) + setup + freight
    const total =
      discountedPerUnit * currentQuantity ;

    setCurrentPrice(total);
  }, [
    currentQuantity,
    selectedPrintMethod,
    freightFee,
    productId,
    marginApi,
    discountPct,
    sortedPriceBreaks,
  ]);

  const handleColorClick = (color) => {
    setSelectedColor(color);
    setActiveImage(colorImages[color] || noimage);
  };

  useEffect(() => {
    if (product) {
      // Check if product has colors
      const hasColors = product?.colours?.list?.length > 0;

      if (hasColors) {
        const firstColor = product.colours.list[0].colours[0];
        setActiveImage(product.images?.[0] || noimage); // show 0 index image when component mounts
      } else {
        setActiveImage(product.images?.[0] || noimage);
      }
    }
  }, [product?.images?.length > 0]); // Run whenever product data changes

  const colorImages = useMemo(() => {
    if (!product?.colours?.list) return {};

    return product.colours.list.reduce((acc, colorObj) => {
      colorObj.colours.forEach((color) => {
        acc[color] = colorObj.image || product.images?.[0] || noimage;
      });
      return acc;
    }, {});
  }, [product]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDivClick = () => {
    document.getElementById("fileUpload").click();
  };

  const handleFileChange2 = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile2(e.target.files[0]);
      const file = e.target.files[0];
      setPreviewImage2(URL.createObjectURL(file));
    }
  };

  const handleDivClick2 = () => {
    document.getElementById("fileUpload2").click();
  };

  useEffect(() => {
    if (!isNaN(originalPrice) && originalPrice > 0) {
      setCurrentPrice(originalPrice * 50);
    } else {
      setCurrentPrice(0);
    }
  }, [originalPrice]);

  const handleBoxClick = (index) => {
    if (index < sortedPriceBreaks.length) {
      const selectedBreak = sortedPriceBreaks[index];
      setCurrentQuantity(selectedBreak.qty);
    }
  };

  const handleIncrement = () => {
    setCurrentQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setCurrentQuantity((prev) => Math.max(prev - 1, 1)); // Minimum quantity is 1
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === "" || /^[0-9]*$/.test(value)) {
      const numericValue = value === "" ? 0 : parseInt(value, 10);
      setCurrentQuantity(numericValue || 0);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
  };

  const onSubmitHandler = async () => {
    try {
      const formData1 = new FormData();

      formData1.append("name", formData.name);
      formData1.append("email", formData.email);
      formData1.append("phone", formData.phone);
      formData1.append("delivery", formData.delivery);
      formData1.append("comment", formData.comment);
      if (selectedFile2) {
        formData1.append("file", selectedFile2);
      }

      const { data } = await axios.post(
        `${backednUrl}/api/checkout/quote`,
        formData1,
        {
          headers: { token },
        }
      );
      if (data.success) {
        toast.success(data.message);
        console.log(data);
      } else {
        console.log(data.message);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const getPrintMethods = (details) => {
    const printAreas = details.find((item) => item.name === "printAreas");
    if (!printAreas) return [];
    return printAreas.detail.split(";").map((method) => {
      const trimmed = method.trim();
      const [printType, ...areas] = trimmed.split(":");
      return {
        type: printType.trim(),
        areas: areas.join(":").trim(),
      };
    });
  };

  // In your component:
  const printMethods = getPrintMethods(single_product?.product?.details || []);

  const formatDeliveryDate = (date) => {
    const options = {
      weekday: "short",
      day: "numeric",
      month: "short",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const deliveryDate = (() => {
    const today = new Date();
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);
    return formatDeliveryDate(twoWeeksLater);
  })();

  // Calculate final per unit price with margin and discount
  const rawPerUnit = unitPrice + marginEntry.marginFlat;
  const discountedUnitPrice = rawPerUnit * (1 - discountPct / 100);

  const handleAddToCart = (e) => {
    e.preventDefault();

    dispatch(
      addToCart({
        id: productId,
        name: product.name,
        basePrices: priceGroups.find(g => g.base_price)?.base_price?.price_breaks || [],
        image: product.images?.[0] || "",
        price: (() => {
          // Get the base product price for current quantity
          const baseProductPrice = getPriceForQuantity(currentQuantity);

          // Sort price breaks and find the correct one for current quantity
          const sortedBreaks = [...selectedPrintMethod.price_breaks].sort(
            (a, b) => a.qty - b.qty
          );
          let selectedBreak = sortedBreaks[0];

          // Find the correct price break for current quantity
          for (let i = 0; i < sortedBreaks.length; i++) {
            if (currentQuantity >= sortedBreaks[i].qty) {
              selectedBreak = sortedBreaks[i];
            } else {
              break;
            }
          }

          // Calculate final unit price based on print method type
          let finalUnitPrice;
          if (selectedPrintMethod.type === "base") {
            finalUnitPrice = selectedBreak.price;
          } else {
            // For decoration, add decoration price to base product price
            finalUnitPrice = baseProductPrice + selectedBreak.price;
          }

          // Add margin and apply discount
          const rawPerUnit = finalUnitPrice + marginEntry.marginFlat;
          return rawPerUnit * (1 - discountPct / 100);
        })(),
        marginFlat: marginEntry.marginFlat,
        totalPrice: currentPrice,
        discountPct,
        code: product.code,
        color: selectedColor,
        quantity: currentQuantity, // Use the actual quantity
        print: selectedPrintMethod.description,
        logoColor: logoColor,
        freightFee: freightFee,
        setupFee: selectedPrintMethod.setup || 0,
        dragdrop: selectedFile,
        deliveryDate,
        priceBreaks: selectedPrintMethod.price_breaks,
        printMethodKey: selectedPrintMethod.key,
      })
    );
    navigate("/cart");
  };

  if (error)
    return (
      <div className="flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-300 rounded-full border-t-blue-500 animate-spin"></div>
      </div>
    );

  return (
    <>
      <div className="Mycontainer ">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-[28%_45%_24%] gap-8 mt-8">
          {/* 1st culmn  */}
          {skeletonLoading ? (
            Array.from({ length: 1 }).map((_, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg shadow-md h-fit border-border2"
              >
                <Skeleton height={200} className="rounded-md" />
                <div className="flex items-center justify-between gap-2">
                  <Skeleton height={60} width={58} className="rounded-md" />
                  <Skeleton height={60} width={58} className="rounded-md" />
                  <Skeleton height={60} width={58} className="rounded-md" />
                  <Skeleton height={60} width={58} className="rounded-md" />
                </div>
              </div>
            ))
          ) : (
            <div>
              <div className="mb-4 border border-border2">
                <img src={activeImage} alt={product?.name} className="w-full" />
              </div>

              <Swiper
                navigation={{
                  prevEl: ".custom-prev",
                  nextEl: ".custom-next",
                }}
                modules={[Navigation]}
                className="mySwiper"
                breakpoints={{
                  0: { slidesPerView: 2, spaceBetween: 5 },
                  580: { slidesPerView: 3, spaceBetween: 10 },
                  1024: { slidesPerView: 4, spaceBetween: 10 },
                }}
              >
                <div className="absolute left-0 top-[47%] transform -translate-y-1/2 z-10">
                  <button className="p-1 text-white rounded-full custom-prev bg-smallHeader lg:p-2 md:p-2 sm:p-2">
                    <IoArrowBackOutline className="text-base lg:text-xl md:text-xl sm:text-xl" />
                  </button>
                </div>

                <div className="absolute right-0 top-[47%] transform -translate-y-1/2 z-10">
                  <button className="p-1 text-white rounded-full custom-next bg-smallHeader lg:p-2 md:p-2 sm:p-2">
                    <IoMdArrowForward className="text-base lg:text-xl md:text-xl sm:text-xl" />
                  </button>
                </div>

                {product?.images?.map((item, index) => (
                  <SwiperSlide key={index}>
                    <div
                      className="flex justify-center px-2 py-3 cursor-pointer bg-line lg:px-0 md:px-0 sm:px-0"
                      onClick={() => {
                        setActiveImage(item);
                        // setSelectedColor('')
                      }}
                    >
                      <img
                        src={item}
                        alt={`Thumbnail ${index}`}
                        className={`w-full border-2  ${
                          activeImage === item
                            ? "border-smallHeader"
                            : "border-transparent"
                        }`}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
          {/* 2nd column  */}
          <div>
            <h2
              className={`text-2xl ${
                product?.name ? "font-bold" : "font-medium"
              }`}
            >
              {product?.name ? product?.name : "Loading ..."}
            </h2>
            <div className="flex flex-wrap items-center ">
              <span className="text-2xl text-smallHeader">★★★★★</span>
              <p className="ml-2 text-gray-600">
                4.7 Star Rating (1767 User Feedback)
              </p>
            </div>
            <div className="flex items-center justify-between pb-2 border-b-2">
              <p className="text-black">{product?.code}</p>
              <p className="font-bold text-smallHeader">
                <span className="font-normal text-stock"> Availability:</span>{" "}
                In Stock
              </p>
            </div>

            {/* Color Selection */}
            <div className="mb-2">
              <p className="mt-2 font-medium">Color:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {single_product?.product?.colours?.list.length > 0 ? (
                  single_product?.product?.colours?.list?.map(
                    (colorObj, index) => (
                      <div key={index}>
                        {colorObj.colours.map((color, subIndex) => {
                          return (
                            <div
                              key={`${index}-${subIndex}`}
                              className={`px-2 py-1 text-xs font-medium rounded-full cursor-pointer border ${
                                selectedColor === color
                                  ? "border-[3px] border-blue-500"
                                  : "border-slate-900"
                              }`}
                              // onClick={() => setSelectedColor(color)}
                              onClick={() => handleColorClick(color)}
                            >
                              {color}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )
                ) : (
                  <p>No colors available for this product</p>
                )}
              </div>
            </div>

            {/* Dropdowns */}
            <div className="">
              <label htmlFor="print-method" className="block mb-2 font-medium">
                Print Method:
              </label>
              <select
                id="print-method"
                value={selectedPrintMethod?.key}
                onChange={(e) => {
                  const selected = availablePriceGroups.find(
                    (method) => method.key === e.target.value
                  );
                  setSelectedPrintMethod(selected);
                  // Reset quantity to first price break of new selection
                  if (selected?.price_breaks?.length > 0) {
                    console.log("Selected price breaks:", selected.price_breaks[0].qty);
                    setCurrentQuantity(selected.price_breaks[0].qty);
                  }
                }}
                className="w-full px-2 py-4 border rounded-md outline-none"
              >
                {availablePriceGroups.map((method, index) => (
                  <option key={method.key} value={method.key}>
                    {method.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 ">
              <label
                htmlFor="logo-color"
                className="block pt-3 mb-2 font-medium"
              >
                Logo Colour:
              </label>
              <select
                value={logoColor}
                onChange={(e) => setLogoColor(e.target.value)}
                id="logo-color"
                className="w-full px-2 py-4 border rounded-md outline-none"
              >
                <option>1 Colour Print</option>
                <option>2 Colour Print</option>
              </select>
            </div>

            <div>
              <p className="mt-2 mb-2 text-sm font-medium ">
                {" "}
                Quantity ({currentQuantity}):
              </p>

              <div className="grid gap-2 mt-4 lg:grid-cols-4 max-md:grid-cols-3 max-default:grid-cols-2">
                {selectedPrintMethod?.price_breaks?.map((item, i) => {
                  const marginEntry = marginApi[productId];

                  // Get base product price for this quantity
                  const baseProductPrice = getPriceForQuantity(item.qty);

                  // Calculate final unit price based on print method type
                  let finalUnitPrice;
                  if (selectedPrintMethod.type === "base") {
                    finalUnitPrice = item.price;
                  } else {
                    finalUnitPrice = baseProductPrice + item.price;
                  }

                  const rawTierPrice = marginEntry
                    ? finalUnitPrice + marginEntry.marginFlat
                    : finalUnitPrice;

                  const discountedTierPrice = rawTierPrice * discountMultiplier;

                  return (
                    <div
                      className={`flex cursor-pointer justify-center border border-smallHeader items-end gap-2 px-2 py-3 ${
                        activeIndex === i ? "border-blue-500 bg-blue-50" : ""
                      }`}
                      key={i}
                      // onClick={() => handleBoxClick(i)}
                      onClick={() => {
                        setCurrentQuantity(item.qty);
                        setActiveIndex(i);
                      }}
                    >
                      {activeIndex === i && (
                        <span className="bg-smallHeader p-1 rounded-[50%] ">
                          <FaCheck className="text-sm text-white" />
                        </span>
                      )}
                      <div>
                        <p className="text-sm text-center">
                          {i === 0 && "0 - "}
                          {item.qty}+
                        </p>
                        <p className="text-sm">
                          $
                          {discountedTierPrice.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div
                  className="flex justify-center px-4 py-4 text-center border cursor-pointer border-smallHeader lg:col-span-2 max-md:col-span-3 max-default:col-span-2"
                  onClick={() => setShowQuoteForm(true)}
                >
                  <p className="text-sm font-semibold">Larger Order?</p>
                </div>
              </div>
            </div>
            <div className="mt-3 mb-3">
              <div className="py-3 border rounded-md border-smallHeader">
                <div className="flex items-center justify-between gap-2 px-6">
                  <button onClick={handleDecrement} className="text-2xl">
                    -
                  </button>
                  <input
                    type="text"
                    value={currentQuantity}
                    onChange={handleInputChange}
                    className="text-xl text-center w-[80%] border-none outline-none"
                    min="1"
                  />
                  <button onClick={handleIncrement} className="text-2xl">
                    +
                  </button>
                </div>
              </div>
            </div>
            <div
              className="p-6 mb-6 text-center border-2 border-dashed cursor-pointer bg-dots border-smallHeader"
              onClick={handleDivClick}
            >
              <img
                src={selectedFile || "/drag.png"}
                alt="Uploaded File"
                className="flex m-auto max-w-[100px] max-h-[100px] object-contain"
              />
              <p className="mt-4 mb-2 text-lg font-medium text-smallHeader">
                Drag & drop files or Browse
              </p>
              <p className="text-smallHeader max-w-[385px] m-auto text-sm">
                Supported formats: AI, EPS, SVG, PDF, JPG, JPEG, PNG. Max file
                size: 16 MB
              </p>
              <input
                type="file"
                id="fileUpload"
                accept=".ai, .eps, .svg, .pdf, .jpg, .jpeg, .png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <Link
              onClick={(e) => {
                handleAddToCart(e);
              }}
              className="flex items-center justify-center w-full gap-3 px-2 py-3 text-white rounded-sm cursor-pointer bg-smallHeader"
            >
              <button className="text-sm uppercase">Add to cart</button>
              <IoCartOutline className="text-xl" />
            </Link>
          </div>
          {/* 3rd column  */}

          <div className="">
            <div className="px-6 py-5 border bg-perUnit border-border">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold text-smallHeader">
                  $
                  {discountedUnitPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs font-normal text-smallHeader">
                  (Per Unit)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4 ">
                <p className="text-2xl font-bold text-smallHeader ">
                  $
                  {currentPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs font-normal text-smallHeader">(Total)</p>
              </div>

              <div
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="flex items-center justify-center gap-2 py-2 text-white cursor-pointer bg-smallHeader"
              >
                <img src="/money.png" alt="" />
                <button className="text-sm">Get Express Quote</button>
              </div>
              <div
                onClick={() => {
                  dispatch(
                    addToCart({
                      id: productId,
                      name: product.name,
                      image: product.images?.[0] || "",
                      price: perUnitWithMargin,
                      marginFlat: marginEntry.marginFlat,
                      discountPct,
                      code: product.code,
                      color: selectedColor,
                      quantity: 1, // Force quantity to 1 for sample
                      print: selectedPrintMethod?.description || "",
                      logoColor: logoColor,
                      setupFee: selectedPrintMethod?.setup || 0,
                      dragdrop: selectedFile,
                      deliveryDate,
                      priceBreaks: selectedPrintMethod?.price_breaks || [], // Add fallback
                      printMethodKey: selectedPrintMethod?.key || "",
                    })
                  );
                  navigate("/cart");
                }}
                className="flex items-center justify-center gap-2 py-2 mt-2 text-white cursor-pointer bg-buy"
              >
                <img src="/buy2.png" alt="" />
                <button className="text-sm">BUY 1 SAMPLE</button>
              </div>
              <div className="mt-6">
                <p className="text-sm text-black">
                  Est Delivery Date: {deliveryDate}
                </p>
                <p className="pt-2 text-xs text-black ">
                  $6.34 (Non-Branded sample) + $10.00 delivery
                </p>
              </div>
              <div className="pb-4 mt-2 mb-4 border-b">
                <div className="flex items-start gap-2 pt-3 ">
                  <p className="text-white bg-gren p-1 rounded-[50%] text-xs ">
                    <FaCheck />
                  </p>
                  <p className="text-sm">
                    Color: {selectedColor ? selectedColor : "No color selected"}
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-3 ">
                  <p className="text-white bg-gren p-1 rounded-[50%] text-xs ">
                    <FaCheck />
                  </p>
                  <p className="text-sm">
                    Print Method:{" "}
                    {selectedPrintMethod?.description || "Not selected"}
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-3 ">
                  <p className="text-white bg-gren p-1 rounded-[50%] text-xs ">
                    <FaCheck />
                  </p>
                  <p className="text-sm">
                    Logo Color: {logoColor || "No logo color selected"}
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-3 ">
                  <p className="text-white bg-gren p-1 rounded-[50%] text-xs ">
                    <FaCheck />
                  </p>
                  {/* <p className='text-sm'>Quantity: {quantity2[activeIndex]?.sell || 50}</p> */}
                  <p className="text-sm">Quantity: {currentQuantity}</p>
                </div>

                <div className="flex items-start gap-2 pt-3 ">
                  <p className="text-white bg-gren p-1 rounded-[50%] text-xs ">
                    <FaCheck />
                  </p>
                  <p className="text-sm">
                    Setup Charge: $
                    {selectedPrintMethod?.setup?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-3 ">
                  <p className="text-white bg-gren p-1 rounded-[50%] text-xs ">
                    <FaCheck />
                  </p>
                  <p className="text-sm">
                    'Freight Charge: ${freightFee.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs">See our 87 reviews on</p>
                <img src="/star.png" alt="" />
              </div>
            </div>

            {/* Show on click */}
            {showQuoteForm && (
              <div className="bg-perUnit border border-border py-5 mt-0.5">
                <button className="w-full py-3 text-sm text-white bg-smallHeader">
                  We'll Email You A Quote
                </button>
                <div className="px-6 mt-7">
                  <input
                    name="name"
                    value={formData.name}
                    type="text"
                    placeholder="Your name"
                    className="w-full p-3 rounded shadow outline-none shadow-shadow bg-line"
                    onChange={handleChange}
                  />
                  <input
                    name="email"
                    value={formData.email}
                    type="email"
                    placeholder="Email"
                    className="w-full p-3 mt-2 rounded shadow outline-none shadow-shadow"
                    onChange={handleChange}
                  />
                  <input
                    name="phone"
                    value={formData.phone}
                    type="phone"
                    placeholder="Phone"
                    className="w-full p-3 mt-2 rounded shadow outline-none shadow-shadow"
                    onChange={handleChange}
                  />
                  <input
                    name="delivery"
                    value={formData.delivery}
                    type="text"
                    placeholder="Delivery state"
                    className="w-full p-3 mt-2 rounded shadow outline-none shadow-shadow"
                    onChange={handleChange}
                  />

                  <div>
                    <p className="pt-6 text-xs">Logo Artworks</p>
                    <div className="px-5 mt-4 text-center border shadow cursor-pointer shadow-shadow bg-line py-7 border-smallHeader">
                      {selectedFile2 ? (
                        <img
                          // value={formData.file}
                          src={previewImage2}
                          alt="Uploaded File"
                          className="flex m-auto max-w-[100px] max-h-[100px] object-contain"
                        />
                      ) : (
                        <>
                          <img
                            src="/drag.png"
                            alt="Drag"
                            className="flex m-auto text-smallHeader"
                          />
                          <p className="pt-4 text-xs">Drop files here or</p>
                        </>
                      )}
                      <button
                        onClick={handleDivClick2}
                        className="w-full py-3 mt-4 text-sm font-bold text-white uppercase rounded bg-smallHeader"
                      >
                        select file
                      </button>
                      <input
                        type="file"
                        id="fileUpload2"
                        accept=".ai, .eps, .svg, .pdf, .jpg, .jpeg, .png"
                        className="hidden"
                        onChange={handleFileChange2}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="pt-3 text-xs">
                      Accepted file types: ai, eps, svg, pdf, jpg, jpeg, png,
                      Max. file size: 16 MB.
                    </p>
                    <textarea
                      onChange={handleChange}
                      value={formData.comment}
                      name="comment"
                      placeholder="comment"
                      id=""
                      className="w-full px-4 py-3 mt-4 border shadow outline-none h-36 shadow-shadow bg-line border-smallHeader"
                    ></textarea>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-4 mt-3 mb-5 border border-border">
                    <input type="checkbox" id="not-robot" className="w-4 h-4" />
                    <label htmlFor="not-robot" className="text-sm">
                      I'm not a robot
                    </label>
                  </div>

                  <button
                    onClick={onSubmitHandler}
                    className="w-full py-3 font-medium text-white rounded-md bg-smallHeader"
                  >
                    GET YOUR QUOTE
                  </button>
                </div>
              </div>
            )}

            {/* Show on click */}
          </div>
        </div>
      </div>
      <div className="mt-12">
        <DescripTabs single_product={single_product} />
      </div>
    </>
  );
};

export default ProductDetails;
