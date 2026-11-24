/// One line of the cart: a product variation with its delivery fields (player ID, pseudo...).
class CartItem {
  CartItem({
    required this.productId,
    required this.productName,
    required this.variationId,
    required this.variationName,
    required this.unitPrice,
    required this.currency,
    this.imageUrl,
    this.quantity = 1,
    this.fields = const {},
  });

  final String productId;
  final String productName;
  final String variationId;
  final String variationName;
  final num unitPrice;
  final String currency;
  final String? imageUrl;
  final int quantity;
  final Map<String, String> fields;

  String get key => '$productId|$variationId|${fields.entries.map((e) => '${e.key}=${e.value}').join('&')}';

  CartItem copyWith({int? quantity}) => CartItem(
        productId: productId,
        productName: productName,
        variationId: variationId,
        variationName: variationName,
        unitPrice: unitPrice,
        currency: currency,
        imageUrl: imageUrl,
        quantity: quantity ?? this.quantity,
        fields: fields,
      );

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'product_name': productName,
        'variation_id': variationId,
        'variation_name': variationName,
        'unit_price': unitPrice,
        'currency': currency,
        'image_url': imageUrl,
        'quantity': quantity,
        'fields': fields,
      };

  factory CartItem.fromJson(Map<String, dynamic> j) => CartItem(
        productId: '${j['product_id']}',
        productName: '${j['product_name'] ?? ''}',
        variationId: '${j['variation_id'] ?? ''}',
        variationName: '${j['variation_name'] ?? ''}',
        unitPrice: (j['unit_price'] as num?) ?? 0,
        currency: '${j['currency'] ?? 'XOF'}',
        imageUrl: j['image_url'] as String?,
        quantity: (j['quantity'] as num?)?.toInt() ?? 1,
        fields: Map<String, String>.from((j['fields'] as Map?)?.map((k, v) => MapEntry('$k', '$v')) ?? const {}),
      );
}
