import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';

import '../../../core/network/mobile_upload_service.dart';
import '../data/kitchen_management_service.dart';

class KitchenOnboardingScreen extends StatefulWidget {
  const KitchenOnboardingScreen({super.key});

  @override
  State<KitchenOnboardingScreen> createState() => _KitchenOnboardingScreenState();
}

class _KitchenOnboardingScreenState extends State<KitchenOnboardingScreen> {
  final _service = const KitchenManagementService();
  final _uploadService = MobileUploadService();
  final _formKey = GlobalKey<FormState>();
  final _kitchenNameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _phoneController = TextEditingController();
  final _cityController = TextEditingController();
  final _regionController = TextEditingController();
  final _addressController = TextEditingController();
  final _logoController = TextEditingController();
  final _coverController = TextEditingController();
  final _instapayHandleController = TextEditingController();
  final _instapayLinkController = TextEditingController();
  final _nationalIdController = TextEditingController();

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _kitchenNameController.dispose();
    _descriptionController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _regionController.dispose();
    _addressController.dispose();
    _logoController.dispose();
    _coverController.dispose();
    _instapayHandleController.dispose();
    _instapayLinkController.dispose();
    _nationalIdController.dispose();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final profile = await _service.loadProfile(sessionToken: token.jwt);

      if (profile == null || !mounted) {
        return;
      }

      _kitchenNameController.text = profile.kitchenName;
      _descriptionController.text = profile.description ?? '';
      _phoneController.text = profile.phoneNumber;
      _cityController.text = profile.cityName;
      _regionController.text = profile.regionName;
      _addressController.text = profile.addressLine;
      _logoController.text = profile.logoUrl ?? '';
      _coverController.text = profile.coverImageUrl ?? '';
      _instapayHandleController.text = profile.instapayHandle ?? '';
      _instapayLinkController.text = profile.instapayLink ?? '';
      setState(() {});
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إعداد المطبخ'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _field(_kitchenNameController, 'اسم المطبخ'),
            _field(_descriptionController, 'الوصف', maxLines: 3),
            _field(_phoneController, 'رقم الهاتف'),
            _field(_cityController, 'المدينة'),
            _field(_regionController, 'المنطقة'),
            _field(_addressController, 'العنوان', maxLines: 2),
            _imageField(
              _logoController,
              'رابط اللوجو',
              'kitchenLogo',
            ),
            _imageField(
              _coverController,
              'رابط صورة الغلاف',
              'kitchenCover',
            ),
            _field(_instapayHandleController, 'معرّف InstaPay'),
            _field(_instapayLinkController, 'رابط الدفع'),
            _imageField(
              _nationalIdController,
              'رابط صورة البطاقة',
              'kitchenDocument',
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _isSaving ? null : _save,
              icon: _isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(_isSaving ? 'جارٍ الحفظ...' : 'حفظ بيانات المطبخ'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label, {
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controller,
        maxLines: maxLines,
        validator: (value) {
          if ((label == 'اسم المطبخ' ||
                  label == 'رقم الهاتف' ||
                  label == 'المدينة' ||
                  label == 'المنطقة' ||
                  label == 'العنوان') &&
              (value == null || value.trim().isEmpty)) {
            return 'هذا الحقل مطلوب';
          }
          return null;
        },
        decoration: InputDecoration(labelText: label),
      ),
    );
  }

  Widget _imageField(
    TextEditingController controller,
    String label,
    String purpose,
  ) {
    return Column(
      children: [
        _field(controller, label),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: () => _uploadImage(controller, purpose),
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('اختيار ورفع صورة'),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSaving = true);

    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      await _service.saveProfile(
        sessionToken: token.jwt,
        payload: {
          'kitchenName': _kitchenNameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'phoneNumber': _phoneController.text.trim(),
          'cityName': _cityController.text.trim(),
          'regionName': _regionController.text.trim(),
          'addressLine': _addressController.text.trim(),
          'logoUrl': _logoController.text.trim(),
          'coverImageUrl': _coverController.text.trim(),
          'instapayHandle': _instapayHandleController.text.trim(),
          'instapayLink': _instapayLinkController.text.trim(),
          'nationalIdImageUrl': _nationalIdController.text.trim(),
        },
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم حفظ بيانات المطبخ بنجاح.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _uploadImage(
    TextEditingController controller,
    String purpose,
  ) async {
    try {
      final authState = ClerkAuth.of(context, listen: false);
      final token = await authState.sessionToken();
      final url = await _uploadService.pickAndUploadImage(
        sessionToken: token.jwt,
        purpose: purpose,
      );

      if (url != null && mounted) {
        controller.text = url;
        setState(() {});
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }
}
